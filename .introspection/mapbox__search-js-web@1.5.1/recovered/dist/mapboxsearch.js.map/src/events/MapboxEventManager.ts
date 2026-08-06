import { SEARCH_SERVICE } from '../utils/services';
import {
  EventPayloadOptionsData,
  Options,
  Suggestion,
  getSearchUrlPath,
  transformApiOptionsForEventSchema,
  transformSuggestionsForEventSchema
} from './utils';
import { version as SDK_VERSION, name as SDK_NAME } from '../../package.json';
import mapboxgl from 'mapbox-gl';

type SearchEventType = 'search.start' | 'search.keystroke' | 'search.select';

interface SearchEventBasePayload {
  // event metadata
  event: SearchEventType; // REQUIRED
  created: number; // REQUIRED
  version?: string;
  // environment info
  userAgent?: string;
  keyboardLocale?: string;
  // session info
  sessionIdentifier: string; // REQUIRED
  // map info
  mapZoom?: number;
  mapCenterLng?: number;
  mapCenterLat?: number;
  // search config/options
  country?: string[];
  language?: string[];
  bbox?: number[];
  types?: string[];
  endpoint?: string;
  autocomplete?: boolean;
  fuzzyMatch?: boolean;
  proximity?: number[];
  limit?: number;
  routing?: boolean;
  worldview?: string;
  // request info
  queryString: string; // REQUIRED
}

interface SearchEventStartPayload extends SearchEventBasePayload {
  event: 'search.start';
}

interface SearchEventKeystrokePayload extends SearchEventBasePayload {
  event: 'search.keystroke';
  lastAction: string; // REQUIRED
  path?: string;
  streets?: boolean;
  permanent?: boolean;
}

interface SearchEventSelectPayload extends SearchEventBasePayload {
  event: 'search.select';
  resultIndex: number; // REQUIRED
  resultPlaceName?: string;
  resultId?: string;
  path: string; // REQUIRED
  streets?: boolean;
  permanent?: boolean;
  suggestionIds: string[]; // REQUIRED
  suggestionNames?: string[];
  suggestionTypes?: string[];
  suggestionSources?: string[];
  resultMapboxId?: string;
}

type SearchEventPayload =
  | SearchEventStartPayload
  | SearchEventKeystrokePayload
  | SearchEventSelectPayload;

interface SessionTokenOptions {
  sessionToken: string;
}

interface AccessTokenOptions {
  accessToken: string;
}

type EventOptions = Options & SessionTokenOptions & AccessTokenOptions;

interface SearchEventArgs {
  queryString: string;
  lastInput?: string;
  selectedIndex?: number;
  suggestions?: Suggestion[];
  options: EventOptions;
  map?: mapboxgl.Map;
  responseHeaders?: Headers;
}

export class MapboxEventManager {
  #origin = 'https://api.mapbox.com';
  #endpoint = 'events/v2';
  #access_token: string;
  #userAgent: string;
  #locale = navigator.language || null;
  #eventQueue: SearchEventPayload[] = [];

  // keep some state to deduplicate requests if necessary
  #lastSentInput = '';
  #lastSentIndex = 0;

  // track if session is new or continuing
  #fresh = true;

  #flushInterval = 1000;
  #maxQueueSize = 100;
  #timer: NodeJS.Timeout;

  #service: SEARCH_SERVICE;

  constructor(service: SEARCH_SERVICE) {
    this.#service = service;
    this.#userAgent = this.#getUserAgent();
    this.#timer = setTimeout(this.#flush, this.#flushInterval);
  }

  /**
   * Send a search.start event to the mapbox events service
   * This turnstile event marks when a user starts a new search
   * @param queryString The value of the search query string
   * @param options API options
   * @param map A mapbox-gl map instance
   * @param responseHeaders API response headers
   * @returns
   */
  start = (
    queryString: string,
    options: EventOptions,
    map?: mapboxgl.Map,
    responseHeaders?: Headers
  ): void => {
    this.#access_token = options.accessToken;

    const payload = this.#getEventPayload('search.start', {
      queryString,
      options,
      map,
      responseHeaders
    }) as SearchEventStartPayload;
    if (!payload) return; // reject malformed event
    this.#push(payload);
  };

  /**
   * Send a search.keystroke event to the mapbox events service
   * This event records each time the input is changed
   * @param queryString The value of the search query string
   * @param lastInput The last character(s) typed by the user
   * @param options API options
   * @param map A mapbox-gl map instance
   * @param responseHeaders API response headers
   * @returns
   */
  input = (
    queryString: string,
    lastInput: string,
    options: EventOptions,
    map?: mapboxgl.Map,
    responseHeaders?: Headers
  ): void => {
    this.#access_token = options.accessToken;

    if (this.#fresh) {
      this.start(queryString, options, map, responseHeaders);
      this.#fresh = false;
    }

    // pass invalid event
    if (!lastInput) return;

    const payload = this.#getEventPayload('search.keystroke', {
      lastInput,
      queryString,
      options,
      map,
      responseHeaders
    }) as SearchEventKeystrokePayload;
    if (!payload) return; // reject malformed event
    this.#push(payload);
  };

  /**
   * Send a search.select event to the mapbox events service
   * This event marks the array index of the item selected by the user out of the array of possible suggestions
   * @param queryString The value of the search query string
   * @param selectedIndex The index of the selected item in the suggestions array
   * @param suggestions The array of suggestions presented to the user
   * @param options API options
   * @param map A mapbox-gl map instance
   * @param responseHeaders API response headers
   * @returns
   */
  select = (
    queryString: string,
    selectedIndex: number,
    suggestions: Suggestion[],
    options: EventOptions,
    map?: mapboxgl.Map,
    responseHeaders?: Headers
  ): void => {
    this.#access_token = options.accessToken;

    const payload = this.#getEventPayload('search.select', {
      queryString,
      selectedIndex,
      suggestions,
      options,
      map,
      responseHeaders
    }) as SearchEventSelectPayload;

    if (!payload) return; // reject malformed event
    if (
      (payload.resultIndex === this.#lastSentIndex &&
        payload.queryString === this.#lastSentInput) ||
      payload.resultIndex === -1
    ) {
      // don't log duplicate events if the user re-selected the same feature on the same search
      return;
    }
    this.#lastSentIndex = payload.resultIndex;
    this.#lastSentInput = payload.queryString;
    this.#push(payload);
  };

  /**
   * End an event session and start a new one
   */
  clear = (): void => {
    this.#fresh = true;
    this.#lastSentInput = '';
    this.#lastSentIndex = 0;

    this.#flush();
  };

  /**
   * Send an event to the events service
   * @param payload Event payload
   */
  #send = (payload: SearchEventPayload[]): void => {
    const eventUrl = `${this.#origin}/${this.#endpoint}?access_token=${
      this.#access_token
    }`;
    const requestOptions = this.#getRequestOptions(payload);
    try {
      fetch(eventUrl, requestOptions);
    } catch (err) {
      this.#handleError(err);
    }
  };

  /**
   * Get http request options
   * @param payload Event payload
   * @returns
   */
  #getRequestOptions = (payload: SearchEventPayload[]): RequestInit => {
    if (!Array.isArray(payload)) payload = [payload];
    const options = {
      // events must be sent with POST
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) // events are arrays
    };
    return options;
  };

  /**
   * * Handle an error that occurred while making a request
   * @param err
   */
  #handleError = (err): void => {
    console.log(err);
  };

  /**
   * Get the event payload to send to the events service
   * @param event the name of the event to send to the events service. Valid options are 'search.start', 'search.keystroke', and 'search.select'.
   * @param eventArgs Additional arguments needed for certain event types
   * @returns
   */
  #getEventPayload = (
    event: SearchEventType,
    eventArgs: SearchEventArgs
  ): SearchEventPayload => {
    // Make sure required arguments are present for certain event types
    if (
      (event === 'search.select' &&
        !(
          typeof eventArgs.selectedIndex === 'number' || eventArgs.suggestions
        )) ||
      (event === 'search.keystroke' && !eventArgs.lastInput)
    ) {
      return null;
    }

    const eventApiOptions = transformApiOptionsForEventSchema(
      eventArgs.options,
      this.#service,
      eventArgs.responseHeaders
    );

    const payload = this.#createBasePayload(
      event,
      eventArgs,
      eventApiOptions
    ) as SearchEventPayload;

    if (event === 'search.keystroke') {
      this.#applySearchEventKeystrokePayload(
        payload as SearchEventKeystrokePayload,
        eventArgs,
        eventApiOptions
      );
    } else if (event === 'search.select') {
      this.#applySearchEventSelectPayload(
        payload as SearchEventSelectPayload,
        eventArgs,
        eventApiOptions
      );
    }

    // Finally, validate that required properties are present for API compatibility
    if (!this.#validatePayload(payload)) {
      return null;
    }

    return payload;
  };

  /**
   * Create a base payload for all event types
   * @param event
   * @param eventArgs
   * @param eventApiOptions
   * @returns
   */
  #createBasePayload = (
    event: SearchEventType,
    eventArgs: SearchEventArgs,
    eventApiOptions: EventPayloadOptionsData
  ): SearchEventBasePayload => {
    let payload: SearchEventBasePayload = {
      event,
      version: this.#getEventSchemaVersion(event),
      created: +new Date(),
      sessionIdentifier: eventArgs.options.sessionToken,
      userAgent: this.#userAgent,
      keyboardLocale: this.#locale,
      queryString: eventArgs.queryString
    };

    // add API option fields
    if (eventApiOptions) {
      payload = {
        ...payload,
        ...eventApiOptions
      };
    }

    // remove fields incompatible with `search.start` schema
    if (event === 'search.start') {
      for (const field of ['streets', 'permanent']) {
        delete payload[field];
      }
    }

    // add map fields
    if (eventArgs.map) {
      const zoom = eventArgs.map.getZoom() || undefined;
      const center = eventArgs.map.getCenter();
      payload = {
        ...payload,
        mapZoom: zoom,
        mapCenterLat: center.lat,
        mapCenterLng: center.lng
      };
    }

    return payload;
  };

  #applySearchEventKeystrokePayload = (
    payload: SearchEventKeystrokePayload,
    eventArgs: SearchEventArgs,
    eventOptions: EventPayloadOptionsData
  ): void => {
    switch (this.#service) {
      case SEARCH_SERVICE.AddressAutofill:
        eventOptions.streets && (payload.streets = eventOptions.streets);
        break;
      case SEARCH_SERVICE.Geocoding:
        eventOptions.permanent && (payload.permanent = eventOptions.permanent);
        break;
    }
    payload.path = getSearchUrlPath(this.#service, eventArgs.queryString);
    payload.lastAction = eventArgs.lastInput;
  };

  #applySearchEventSelectPayload = (
    payload: SearchEventSelectPayload,
    eventArgs: SearchEventArgs,
    eventOptions: EventPayloadOptionsData
  ): void => {
    switch (this.#service) {
      case SEARCH_SERVICE.AddressAutofill:
        eventOptions.streets && (payload.streets = eventOptions.streets);
        break;
      case SEARCH_SERVICE.Geocoding:
        eventOptions.permanent && (payload.permanent = eventOptions.permanent);
        break;
    }

    payload.path = getSearchUrlPath(this.#service, eventArgs.queryString);

    const { selectedIndex, suggestions } = eventArgs;

    if (suggestions && suggestions.length > 0) {
      const eventSchemaSuggestions = transformSuggestionsForEventSchema(
        suggestions,
        this.#service
      );

      // selected feature attributes
      payload.resultIndex = selectedIndex;
      payload.resultPlaceName =
        eventSchemaSuggestions.suggestionNames[selectedIndex];
      payload.resultId = eventSchemaSuggestions.suggestionIds[selectedIndex];
      if (payload.resultId.startsWith('dXJuOm1ie')) {
        payload.resultMapboxId = payload.resultId;
      }

      // suggestion list attributes
      payload.suggestionIds = eventSchemaSuggestions.suggestionIds;
      payload.suggestionNames = eventSchemaSuggestions.suggestionNames;
      payload.suggestionTypes = eventSchemaSuggestions.suggestionTypes;
      payload.suggestionSources = eventSchemaSuggestions.suggestionSources;
    }
  };

  /**
   * Get a user agent string to send with the request to the events service
   * @returns
   */
  #getUserAgent = (): string => {
    return `mapbox.${SDK_NAME.split('/')[1]}.${SDK_VERSION}.${
      navigator.userAgent
    }`;
  };

  /**
   * Get the correct schema version for the event
   * @param event Name of the event
   * @returns
   */
  #getEventSchemaVersion = (event: SearchEventType): string => {
    if (['search.keystroke', 'search.select'].includes(event)) {
      return '2.2';
    } else {
      return '2.0';
    }
  };

  /**
   * Checks if a payload has all the required properties for the event type
   * @param payload Event payload
   * @returns
   */
  #validatePayload = (payload: SearchEventPayload): boolean => {
    if (!payload || !payload.event) return false;

    const searchStartRequiredProps = [
      'event',
      'created',
      'sessionIdentifier',
      'queryString'
    ];
    const searchKeystrokeRequiredProps = [
      'event',
      'created',
      'sessionIdentifier',
      'queryString',
      'lastAction'
    ];
    const searchSelectRequiredProps = [
      'event',
      'created',
      'sessionIdentifier',
      'queryString',
      'resultIndex',
      'path',
      'suggestionIds'
    ];

    const event = payload.event;
    if (event === 'search.start') {
      return this.#objectHasRequiredProps(payload, searchStartRequiredProps);
    } else if (event === 'search.keystroke') {
      return this.#objectHasRequiredProps(
        payload,
        searchKeystrokeRequiredProps
      );
    } else if (event === 'search.select') {
      return this.#objectHasRequiredProps(payload, searchSelectRequiredProps);
    }

    return true;
  };

  /**
   * Checks if an object has all the required properties
   * @param obj Payload object
   * @param requiredProps Array of required properties to check for
   * @returns
   */
  #objectHasRequiredProps = (
    obj: SearchEventPayload,
    requiredProps: string[]
  ): boolean => {
    return requiredProps.every((prop) => {
      if (prop === 'queryString') {
        return typeof obj[prop] === 'string' && obj[prop].length > 0;
      }
      return obj[prop] !== undefined;
    });
  };

  /**
   * Flush out the event queue by sending events to the events service
   */
  #flush = (): void => {
    if (this.#eventQueue.length > 0 && this.#access_token) {
      this.#send(this.#eventQueue);
      this.#eventQueue = [];
    }
    // //reset the timer
    if (this.#timer) clearTimeout(this.#timer);
    if (this.#flushInterval)
      this.#timer = setTimeout(this.#flush, this.#flushInterval);
  };

  /**
   * Push event into the pending queue
   * @param event the event to send to the events service
   * @param forceFlush indicates that the event queue should be flushed after adding this event regardless of size of the queue
   */
  #push = (event: SearchEventPayload, forceFlush?: boolean): void => {
    this.#eventQueue.push(event);
    if (this.#eventQueue.length >= this.#maxQueueSize || forceFlush) {
      this.#flush();
    }
  };

  /**
   * Flush any remaining events from the queue before it is removed
   */
  remove = (): void => {
    this.#flush();
  };
}
