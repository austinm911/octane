import {
  AddressAutofillOptions,
  AddressAutofillSuggestion,
  GeocodeFeature,
  GeocodeOptions,
  LngLat,
  LngLatBounds,
  LngLatLike,
  SearchBoxOptions,
  SearchBoxSuggestion
} from '@mapbox/search-js-core';
import { SEARCH_SERVICE } from '../utils/services';

export interface EventPayloadSuggestionsData {
  suggestionIds: string[];
  suggestionNames: string[];
  suggestionTypes: string[];
  suggestionSources: string[];
}

export interface EventPayloadOptionsData {
  country?: string[];
  language?: string[];
  bbox?: number[];
  types?: string[];
  limit?: number;
  autocomplete?: boolean;
  fuzzyMatch?: boolean;
  proximity?: number[];
  routing?: boolean;
  worldview?: string;
  streets?: boolean;
  permanent?: boolean;
}

export type Suggestion =
  | SearchBoxSuggestion
  | GeocodeFeature
  | AddressAutofillSuggestion;

export type Options =
  | SearchBoxOptions
  | GeocodeOptions
  | AddressAutofillOptions;

/**
 * Parse a proximity value, lng/lat coordinate object, lng/lat string, or 'ip'
 * @param proximity
 * @param responseHeaders
 * @returns
 */
const parseExplicitOrIPProximity = (
  proximity: string | LngLatLike,
  responseHeaders?: Headers
): number[] => {
  if (typeof proximity === 'string') {
    if (proximity === 'ip') {
      const ipProximityHeader = responseHeaders?.get('ip-proximity');
      if (ipProximityHeader && typeof ipProximityHeader === 'string') {
        return ipProximityHeader.split(',').map(parseFloat);
      } else {
        return [999, 999]; // Alias for 'ip' in event logs
      }
    } else {
      return proximity.split(',').map(Number);
    }
  } else {
    return LngLat.convert(proximity).toArray();
  }
};

/**
 * Converts SearchBox API options to event schema compatible options
 * @param options
 * @returns
 */
const transformSearchBoxAPIOptionsToEventSchema = (
  options: SearchBoxOptions
): EventPayloadOptionsData => {
  const transformedOptions: EventPayloadOptionsData = {};

  if (options.bbox) {
    if (typeof options.bbox === 'string') {
      transformedOptions.bbox = options.bbox.split(',').map(Number);
    } else {
      transformedOptions.bbox = LngLatBounds.convert(
        options.bbox
      ).toFlatArray();
    }
  }

  if (options.proximity) {
    transformedOptions.proximity = parseExplicitOrIPProximity(
      options.proximity
    );
  }

  if (options.country) {
    transformedOptions.country = options.country.split(',');
  }

  if (options.language) {
    transformedOptions.language = options.language.split(',');
  }

  if (options.types) {
    if (typeof options.types === 'string') {
      transformedOptions.types = options.types.split(',');
    } else {
      transformedOptions.types = Array.from(options.types);
    }
  }

  if (options.limit) {
    if (typeof options.limit === 'string') {
      transformedOptions.limit = parseInt(options.limit);
    } else {
      transformedOptions.limit = options.limit;
    }
  }

  return transformedOptions;
};

/**
 * Converts Geocoding API options to event schema compatible options
 * @param options
 * @param responseHeaders
 * @returns
 */
const transformGeocodingAPIOptionsToEventSchema = (
  options: GeocodeOptions,
  responseHeaders?: Headers
): EventPayloadOptionsData => {
  const transformedOptions: EventPayloadOptionsData = {};

  if (options.bbox) {
    if (typeof options.bbox === 'string') {
      transformedOptions.bbox = options.bbox.split(',').map(Number);
    } else {
      transformedOptions.bbox = LngLatBounds.convert(
        options.bbox
      ).toFlatArray();
    }
  }

  if (options.proximity) {
    transformedOptions.proximity = parseExplicitOrIPProximity(
      options.proximity,
      responseHeaders
    );
  }

  if (options.country) {
    transformedOptions.country = options.country.split(',');
  }

  if (options.language) {
    transformedOptions.language = options.language.split(',');
  }

  if (options.types) {
    if (typeof options.types === 'string') {
      transformedOptions.types = options.types.split(',');
    } else {
      transformedOptions.types = Array.from(options.types);
    }
  }

  if (options.limit) {
    if (typeof options.limit === 'string') {
      transformedOptions.limit = parseInt(options.limit);
    } else {
      transformedOptions.limit = options.limit;
    }
  }

  if (typeof options.autocomplete === 'boolean') {
    transformedOptions.autocomplete = options.autocomplete;
  }

  if (options.worldview) {
    transformedOptions.worldview = options.worldview;
  }

  if (options.permanent) {
    transformedOptions.permanent = options.permanent;
  }

  return transformedOptions;
};

/**
 * Converts Address Autofill API options to event schema compatible options
 * @param options
 * @param responseHeaders
 * @returns
 */
const transformAddressAutofillAPIOptionsToEventSchema = (
  options: AddressAutofillOptions,
  responseHeaders?: Headers
): EventPayloadOptionsData => {
  const transformedOptions: EventPayloadOptionsData = {};

  if (options.bbox) {
    if (typeof options.bbox === 'string') {
      transformedOptions.bbox = options.bbox.split(',').map(Number);
    } else {
      transformedOptions.bbox = LngLatBounds.convert(
        options.bbox
      ).toFlatArray();
    }
  }

  if (options.proximity) {
    transformedOptions.proximity = parseExplicitOrIPProximity(
      options.proximity,
      responseHeaders
    );
  }

  if (options.country) {
    transformedOptions.country = options.country.split(',');
  }

  if (options.language) {
    transformedOptions.language = options.language.split(',');
  }

  if (options.limit) {
    if (typeof options.limit === 'string') {
      transformedOptions.limit = parseInt(options.limit);
    } else {
      transformedOptions.limit = options.limit;
    }
  }

  if (options.streets !== undefined && options.streets !== null) {
    if (typeof options.streets === 'string') {
      transformedOptions.streets = options.streets === 'true';
    } else {
      transformedOptions.streets = options.streets;
    }
  }

  return transformedOptions;
};

/**
 * Converts API-specific options to event schema compatible options
 * @param options API options
 * @param service Search service (SearchBox, Geocoding, AddressAutofill)
 * @param responseHeaders Response headers returned by the API
 * @returns
 */
export const transformApiOptionsForEventSchema = (
  options: Options,
  service: SEARCH_SERVICE,
  responseHeaders?: Headers
): EventPayloadOptionsData => {
  switch (service) {
    case SEARCH_SERVICE.SearchBox:
      return transformSearchBoxAPIOptionsToEventSchema(
        options as SearchBoxOptions
      );
    case SEARCH_SERVICE.Geocoding:
      return transformGeocodingAPIOptionsToEventSchema(
        options as GeocodeOptions,
        responseHeaders
      );
    case SEARCH_SERVICE.AddressAutofill:
      return transformAddressAutofillAPIOptionsToEventSchema(
        options as AddressAutofillOptions,
        responseHeaders
      );
  }
};

/**
 * Converts SearchBox API suggestions to event schema compatible suggestions
 * @param suggestions SearchBox API suggestions
 * @returns
 */
const transformSearchBoxAPISuggestionsToEventSchema = (
  suggestions: SearchBoxSuggestion[]
): EventPayloadSuggestionsData => {
  return {
    suggestionIds: suggestions.map((suggestion) => suggestion.mapbox_id || ''),
    suggestionNames: suggestions.map((suggestion) => {
      if (suggestion.feature_type === 'poi') {
        return [suggestion.name, suggestion.full_address]
          .filter(Boolean)
          .join(', ');
      } else if (suggestion.full_address) {
        return suggestion.full_address; // addresses, places
      } else {
        return suggestion.name; // brand, category
      }
    }),
    suggestionTypes: suggestions.map(
      (suggestion) => suggestion.feature_type || ''
    ),
    suggestionSources: suggestions.map((suggestion) => suggestion._source || '')
  };
};

/**
 * Converts Geocoding API suggestions to event schema compatible suggestions
 * @param suggestions Geocoding API suggestions
 * @returns
 */
const transformGeocodingAPISuggestionsToEventSchema = (
  suggestions: GeocodeFeature[]
): EventPayloadSuggestionsData => {
  return {
    suggestionIds: suggestions.map(
      (suggestion) => suggestion.properties.mapbox_id || suggestion.id || ''
    ),
    suggestionNames: suggestions.map(
      (suggestion) => suggestion.properties.full_address || ''
    ),
    suggestionTypes: suggestions.map(
      (suggestion) => suggestion.properties.feature_type || ''
    ),
    suggestionSources: suggestions.map((suggestion) => suggestion._source || '')
  };
};

/**
 * Converts Address Autofill API suggestions to event schema compatible suggestions
 * @param suggestions Address Autofill API suggestions
 * @returns
 */
const transformAddressAutofillAPISuggestionsToEventSchema = (
  suggestions: AddressAutofillSuggestion[]
): EventPayloadSuggestionsData => {
  return {
    suggestionIds: suggestions.map((suggestion) => suggestion.mapbox_id || ''),
    suggestionNames: suggestions.map(
      (suggestion) => suggestion.full_address || ''
    ),
    suggestionTypes: suggestions.map(
      (suggestion) => suggestion.place_type?.[0] || ''
    ),
    suggestionSources: suggestions.map((suggestion) => suggestion._source || '')
  };
};

/**
 * Converts API-specific suggestions to event schema compatible suggestions
 * @param suggestions API suggestions
 * @param service Search service (SearchBox, Geocoding, AddressAutofill)
 * @returns
 */
export const transformSuggestionsForEventSchema = (
  suggestions: Suggestion[],
  service: SEARCH_SERVICE
): EventPayloadSuggestionsData => {
  switch (service) {
    case SEARCH_SERVICE.SearchBox:
      return transformSearchBoxAPISuggestionsToEventSchema(
        suggestions as SearchBoxSuggestion[]
      );
    case SEARCH_SERVICE.Geocoding:
      return transformGeocodingAPISuggestionsToEventSchema(
        suggestions as GeocodeFeature[]
      );
    case SEARCH_SERVICE.AddressAutofill:
      return transformAddressAutofillAPISuggestionsToEventSchema(
        suggestions as AddressAutofillSuggestion[]
      );
  }
};

/**
 * Get the search URL path based on the search service
 * @param service Search service (SearchBox, Geocoding, AddressAutofill)
 * @param queryString The search query string
 * @returns
 */
export const getSearchUrlPath = (
  service: SEARCH_SERVICE,
  queryString?: string
): string => {
  switch (service) {
    case SEARCH_SERVICE.SearchBox:
      return 'search/searchbox/v1/suggest';
    case SEARCH_SERVICE.Geocoding: {
      const isReverseQuery =
        /^[ ]*(-?\d{1,3}(\.\d{0,256})?)[, ]+(-?\d{1,3}(\.\d{0,256})?)[ ]*$/.test(
          queryString
        );
      return `search/geocode/v6/${isReverseQuery ? 'reverse' : 'forward'}`;
    }
    case SEARCH_SERVICE.AddressAutofill:
      return 'autofill/v1/suggest';
  }
};
