import {
  LngLatBounds,
  SearchSession,
  GeocodingCore,
  GeocodingOptions,
  GeocodingFeature,
  GeocodingResponse
} from '@mapbox/search-js-core';
import mapboxgl from 'mapbox-gl';
import subtag from 'subtag';

import {
  MapboxSearchListbox,
  SelectionEventDetail
} from './MapboxSearchListbox';
import { HTMLScopedElement } from './HTMLScopedElement';

import { tryParseJSON } from '../utils';
import { bboxViewport, FLY_TO_SPEED, getMaxZoom } from '../utils/map';

import { Theme, getIcon, getThemeCSS } from '../theme';
import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { GEOCODER_TEMPLATE } from '../constants';

import style from '../style.css';
import { PopoverOptions } from '../utils/popover';
import { createAriaLiveElement } from '../utils/aria';
import { bindElements } from '../utils/dom';
import { SEARCH_SERVICE } from '../utils/services';
import localization from '../utils/localization';
import { InputEventDetail } from '../utils/listbox';
import { MapboxEventManager } from '../events/MapboxEventManager';

/**
 * Proximity is designed for local scale. If the user is looking at the whole world,
 * it doesn't make sense to factor in the arbitrary center of the map.
 */
const MAX_ZOOM = 9;

const DEFAULT_COMPONENT_OPTIONS: MapboxGeocoderComponentOptions = {
  flyTo: true
};

const CORE_COMPONENT_OPTION_KEYS: (keyof MapboxGeocoderComponentOptions)[] = [
  'flipCoordinates'
];

/**
 * Options to configure component-specific Search behavior
 * @typedef MapboxGeocoderComponentOptions
 */
export interface MapboxGeocoderComponentOptions {
  /**
   * If true, the coordinates in the query string are expected to be (lat,lng) instead of (lng,lat).
   */
  flipCoordinates?: boolean;
  /**
   * If `false`, animating the map to a selected result is disabled. If `true` (default), animating the map will use the default animation parameters. If an object, it will be passed as `options` to the map `flyTo` method.
   */
  flyTo?: mapboxgl.FlyToOptions | boolean;
  /**
   * A function accepting the query string which performs supplemental search results
   * on top of those from the Mapbox Geocoding API. Expected to return a Promise
   * which resolves to an array of GeoJSON-like Features as described in the
   * [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object).
   * @param text Query text
   * @returns Promise resolving to an array of properly formatted Feature suggestion objects
   * @example
   * ```typescript
   * async myCustomFunction((query: string) => {
   *    // Perform custom search logic, e.g. fetch from a local database or API (can be sync or async)
   *   const customData = await getData();
   *
   *   // Format the data and return
   *   return customData.map(obj => {
   *     return {
   *       type: 'Feature',
   *       geometry: { type: 'Point', coordinates: [obj.lng, obj.lat] },
   *       properties: { full_address: obj.fullName, name: obj.title }
   *     }
   *   });
   * };
   * ```
   */
  customSearch?: (text: string) => Promise<GeocodingFeature[]>;
}

type Binding = {
  /**
   * Wrapper around the entire Geocoder component.
   */
  Geocoder: HTMLElement;
  /**
   * Container for search icon preceding input
   */
  SearchIcon: HTMLDivElement;
  /**
   * The input element accepting search text
   */
  Input: HTMLInputElement;
  /**
   * Button element used to clear the input element of text
   */
  ClearBtn: HTMLButtonElement;
  /**
   * Animated loading icon triggered by a keystroke
   */
  LoadingIcon: HTMLDivElement;
};

export type MapboxSearchListboxSearchType =
  MapboxSearchListbox<GeocodingFeature>;

type SearchEventTypes = {
  /**
   * Fired when the user is typing and is provided a list of suggestions.
   *
   * The underlying response from {@link GeocodingCore} is passed as the event's detail.
   *
   * @event suggest
   * @instance
   * @memberof MapboxGeocoder
   * @type {GeocodingResponse}
   * @example
   * ```typescript
   * search.addEventListener('suggest', (event) => {
   *   const suggestions = event.detail.suggestions;
   *   // ...
   * });
   * ```
   */
  suggest: MapboxHTMLEvent<GeocodingResponse>;
  /**
   * Fired when {@link GeocodingCore} has errored providing a list of suggestions.
   *
   * The underlying error is passed as the event's detail.
   *
   * @event suggesterror
   * @instance
   * @memberof MapboxGeocoder
   * @type {Error}
   * @example
   * ```typescript
   * search.addEventListener('suggesterror', (event) => {
   *   const error = event.detail;
   *   // ...
   * });
   * ```
   */
  suggesterror: MapboxHTMLEvent<Error>;
  /**
   * Fired when the user has selected a suggestion.
   *
   * The underlying response from {@link GeocodingCore} is passed as the event's detail.
   *
   * @event retrieve
   * @instance
   * @memberof MapboxGeocoder
   * @type {GeocodingFeature}
   * @example
   * ```typescript
   * search.addEventListener('retrieve', (event) => {
   *   const feature = event.detail;
   *   // ...
   * });
   * ```
   */
  retrieve: MapboxHTMLEvent<GeocodingFeature>;
  /**
   * Fired when the user has changed the `<input>` text.
   *
   * The new input value is passed as the event's detail.
   *
   * @event input
   * @instance
   * @memberof MapboxGeocoder
   * @type {string}
   * @example
   * ```typescript
   * search.addEventListener('input', (event) => {
   *   if (e.target !== e.currentTarget) return;
   *   const searchText = event.detail;
   *   // ...
   * });
   * ```
   */
  input: MapboxHTMLEvent<string>;
  /**
   * Fired when the user has cleared the <input> box,
   * either by deleting all text or clicking the "Clear" icon.
   *
   * @event clear
   * @instance
   * @memberof MapboxGeocoder
   * @example
   * ```typescript
   * search.addEventListener('clear', () => {
   *   console.log('search box cleared');
   *   // ...
   * });
   * ```
   */
  clear: MapboxHTMLEvent<unknown>;
  /**
   * Fired when the user moved focus away from the MapboxGeocoder component.
   *
   * @event blur
   * @instance
   * @memberof MapboxGeocoder
   * @example
   * ```typescript
   * search.addEventListener('blur', () => {
   *   console.log('search box blurred');
   *   // ...
   * });
   * ```
   */
  blur: MapboxHTMLEvent<unknown>;
};

/**
 * `MapboxGeocoder`, also available as the element `<mapbox-geocoder>`,
 * is an element that lets you search for addresses and places using
 * the [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding-v6/).
 *
 * It can control a [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) map
 * to zoom to the selected result.
 *
 * Additionally, `MapboxGeocoder` implements the [IControl](https://www.mapbox.com/mapbox-gl-js/api/markers/#icontrol)
 * interface.
 *
 * To use this element, you must have a [Mapbox access token](https://www.mapbox.com/help/create-api-access-token/).
 *
 * @class MapboxGeocoder
 * @example
 * ```typescript
 * const search = new MapboxGeocoder();
 * search.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
 * map.addControl(search);
 * ```
 * @example
 * <mapbox-geocoder
 *   access-token="YOUR_MAPBOX_ACCESS_TOKEN"
 *   proximity="0,0"
 * >
 * </mapbox-geocoder>
 */
export class MapboxGeocoder
  extends HTMLScopedElement<SearchEventTypes>
  implements mapboxgl.IControl
{
  /**
   * This is read by the Web Components API to affect the
   * {@link MapboxGeocoder#attributeChangedCallback} below.
   *
   * All of these are passthroughs to the underlying {@link MapboxSearchListbox}.
   *
   * @ignore
   */
  static observedAttributes: string[] = [
    // Access token.
    'access-token',
    // Theming.
    'theme',
    'popover-options',
    'placeholder',
    // Component options.
    'flip-coordinates',
    // Underlying Geocoding API options.
    'autocomplete',
    'language',
    'country',
    'bbox',
    'limit',
    'proximity',
    'types',
    'worldview',
    'permanent'
  ];

  #binding: Binding;

  #search = new GeocodingCore({});
  #session = new SearchSession<
    GeocodingOptions,
    GeocodingFeature,
    GeocodingResponse,
    GeocodingFeature
  >(this.#search);

  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   *
   * @name accessToken
   * @instance
   * @memberof MapboxGeocoder
   * @example
   * ```typescript
   * search.accessToken = 'pk.my-mapbox-access-token';
   * ```
   */
  get accessToken(): string {
    return this.#search.accessToken;
  }
  set accessToken(newToken: string) {
    this.#search.accessToken = newToken;
  }

  /**
   * The value of the input element.
   *
   * @name value
   * @instance
   * @memberof MapboxGeocoder
   * @example
   * ```typescript
   * console.log(search.value);
   * ```
   */
  get value(): string {
    return this.#input.value;
  }
  set value(newValue: string) {
    this.#input.value = newValue || '';
  }

  #map: mapboxgl.Map | null = null;

  #input: HTMLInputElement;
  #listbox: MapboxSearchListboxSearchType = new MapboxSearchListbox();

  #eventManager = new MapboxEventManager(SEARCH_SERVICE.Geocoding);

  /**
   * The `<input>` element wrapped by the MapboxGeocoder component.
   *
   * @name input
   * @instance
   * @memberof MapboxGeocoder
   * @type {HTMLInputElement}
   */
  get input(): HTMLInputElement {
    return this.#input;
  }

  protected override get template(): HTMLTemplateElement {
    return GEOCODER_TEMPLATE;
  }

  protected override get templateStyle(): string {
    return style;
  }

  protected override get templateUserStyle(): string {
    return getThemeCSS('.Geocoder', this.#listbox.theme);
  }

  /**
   * Options to pass to the underlying {@link GeocodingCore} interface.
   *
   * @name options
   * @instance
   * @memberof MapboxGeocoder
   * @type {GeocodingOptions}
   * @example
   * ```typescript
   * search.options = {
   *  language: 'en',
   *  country: 'US',
   * };
   * ```
   */
  options: Partial<GeocodingOptions> = {};

  #componentOptions: Partial<MapboxGeocoderComponentOptions> = {
    ...DEFAULT_COMPONENT_OPTIONS
  };

  /**
   * Options defining the behavior of web component or its underlying search functionality.
   * Distinct from the {@link GeocodingOptions} options, these do not correspond to the core API specification.
   *
   * @name componentOptions
   * @instance
   * @memberof MapboxGeocoder
   * @type {MapboxGeocoderComponentOptions}
   * @example
   * ```typescript
   * search.componentOptions = {
   *  flipCoordinates: true,
   *  flyTo: true
   * };
   * ```
   */
  get componentOptions(): MapboxGeocoderComponentOptions {
    return this.#componentOptions;
  }
  set componentOptions(options: Partial<MapboxGeocoderComponentOptions>) {
    this.#componentOptions = {
      ...DEFAULT_COMPONENT_OPTIONS,
      ...options
    };
  }

  /**
   * Extracts the subset of the componentOptions that are relevant to GeocoderCore
   */
  #getCoreComponentOptions = (): MapboxGeocoderComponentOptions => {
    const options = { ...this.componentOptions };
    for (const key in options) {
      if (
        CORE_COMPONENT_OPTION_KEYS.indexOf(
          key as keyof MapboxGeocoderComponentOptions
        ) === -1
      ) {
        delete options[key];
      }
    }
    return options;
  };

  /**
   * The {@link Theme} to use for styling the suggestion box and geocoder input box.
   *
   * @name theme
   * @instance
   * @memberof MapboxGeocoder
   * @type {Theme}
   * @example
   * ```typescript
   * search.theme = {
   *   variables: {
   *     colorPrimary: 'myBrandRed'
   *   },
   *   cssText: ".Input:active { opacity: 0.9; }"
   * };
   * ```
   */
  get theme(): Theme {
    return this.#listbox.theme;
  }
  set theme(theme: Theme) {
    this.#listbox.theme = theme;

    if (!this.#binding || !theme) {
      return;
    }

    this.updateTemplateUserStyle(getThemeCSS('.Geocoder', theme));
    this.#listbox.updatePopover();

    const { SearchIcon } = this.#binding;
    SearchIcon.innerHTML = getIcon('search', theme);
  }

  /**
   * The {@link PopoverOptions} to define popover positioning.
   *
   * @name popoverOptions
   * @instance
   * @memberof MapboxGeocoder
   * @type {PopoverOptions}
   * @example
   * ```typescript
   * search.popoverOptions = {
   *   placement: 'top-start',
   *   flip: true,
   *   offset: 5
   * };
   * ```
   */
  get popoverOptions(): Partial<PopoverOptions> {
    return this.#listbox.popoverOptions;
  }
  set popoverOptions(newOptions: Partial<PopoverOptions>) {
    this.#listbox.popoverOptions = newOptions;
  }

  #getDefaultPlaceholder(): string {
    if (this.options.language) {
      const firstLanguage = this.options.language.split(',')[0];
      const language = subtag.language(firstLanguage);
      const localizedValue = localization.placeholder[language];
      if (localizedValue) return localizedValue;
    }
    return 'Search';
  }

  #placeholder: string;

  /**
   * The input element's placeholder text. The default value may be localized if {@link GeocodingOptions#language} is set.
   *
   * @name placeholder
   * @instance
   * @memberof MapboxGeocoder
   * @type {string}
   */
  get placeholder(): string {
    return this.#placeholder || this.#getDefaultPlaceholder();
  }

  set placeholder(text: string) {
    this.#placeholder = text;
    if (this.#input) {
      this.#input.placeholder = this.placeholder;
      this.#input.setAttribute('aria-label', this.placeholder);
    }
  }

  #handleSuggest = async (result: GeocodingResponse): Promise<void> => {
    this.#setActionIcons();

    let features: GeocodingFeature[] | null = null;

    // Integrate optional custom search results
    if (this.componentOptions.customSearch) {
      const customFeatures = await this.componentOptions.customSearch(
        this.value
      );
      if (customFeatures && customFeatures.length) {
        customFeatures.forEach((feature) => {
          feature._source = 'custom';
        });
        features = customFeatures;
      }
    }

    // Integrate results from the Mapbox Geocoding API
    if (result && result.features) {
      if (!features) {
        features = result.features;
      } else {
        features = features.concat(result.features);
      }
    }

    this.#listbox.handleSuggest(features || null);

    // If focus is not already on the web component, focus it.
    // This ensures that a future 'blur' event is available to hide the results.
    // This could happen under the following scenarios:
    // 1. User types in the input, then moves focus away before suggestions return
    // 2. Suggest is triggered programmatically via the search() method
    // 3. Browser autofill (e.g. for Safari iOS) removes focus from the input
    if (!this.#binding.Geocoder.contains(document.activeElement)) {
      this.focus();
    }

    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('suggest', result));
  };

  #handleSuggestError = async (error: Error): Promise<void> => {
    this.#setActionIcons();

    if (this.componentOptions.customSearch) {
      // If a custom search function is provided, attempt to generate and render suggestions from it
      const customFeatures = await this.componentOptions.customSearch(
        this.value
      );
      if (customFeatures && customFeatures.length) {
        customFeatures.forEach((feature) => {
          feature._source = 'custom';
        });
        this.#listbox.handleSuggest(customFeatures || null);
      } else {
        this.#listbox.handleError();
      }
    } else {
      // Otherwise, hide the listbox
      this.#listbox.handleError();
    }
    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('suggesterror', error));
  };

  #handleRetrieve = (result: GeocodingFeature): void => {
    this.#setActionIcons();

    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('retrieve', result));

    const feature = result;
    if (!feature) {
      return;
    }

    // Set value of the input.
    this.#input.value = feature.properties.full_address;

    const map = this.#map;
    if (!map) {
      return;
    }

    if (this.componentOptions.flyTo) {
      this.#fly(feature);
    }

    // Add marker to map
    if (this.marker && this.mapboxgl) {
      this.#handleMarker(feature);
    }
  };

  #mapMarker: mapboxgl.Marker;

  /**
   * Handle the removal of a feature marker
   */
  #removeMarker = (): void => {
    if (this.#mapMarker) {
      this.#mapMarker.remove();
      this.#mapMarker = null;
    }
  };

  /**
   * Handle the placement of a marker for the selected feature
   */
  #handleMarker = (feature: GeocodingFeature | null): void => {
    // clean up any old marker that might be present
    if (!this.#map) {
      return;
    }
    this.#removeMarker();

    if (!feature) return;

    const defaultMarkerOptions = {
      color: '#4668F2'
    };
    const markerOptions = {
      ...defaultMarkerOptions,
      ...(typeof this.marker === 'object' && this.marker)
    };
    this.#mapMarker = new this.mapboxgl.Marker(markerOptions);
    if (
      feature.geometry &&
      feature.geometry.type &&
      feature.geometry.type === 'Point' &&
      feature.geometry.coordinates
    ) {
      this.#mapMarker
        .setLngLat(feature.geometry.coordinates as mapboxgl.LngLatLike)
        .addTo(this.#map);
    }
  };

  /**
   * A callback providing the opportunity to validate and/or manipulate the input text before it triggers a search, for example by using a regular expression.
   * If a truthy string value is returned, it will be passed into the underlying search API. If `null`, `undefined` or empty string is returned, no search request will be performed.
   *
   * @name interceptSearch
   * @instance
   * @memberof MapboxGeocoder
   * @example
   * Enable search only when the input value length is more than 3 characters.
   * ```typescript
   * search.interceptSearch = (val) => val?.length > 3 ? val : null;
   * ```
   */
  interceptSearch: (val: string) => string = null;

  #onHandleInput = (e: MapboxHTMLEvent<InputEventDetail>): void => {
    // Manually bubble up the event as a basic input event.
    this.dispatchEvent(
      new MapboxHTMLEvent<string>('input', e.detail.inputText)
    );

    const { lastInput, inputText } = e.detail;

    // Clear text, suggestions, markers, etc. if empty string
    if (!inputText) {
      this.#handleClear();
      return;
    }

    const alteredText = this.interceptSearch && this.interceptSearch(inputText);

    const searchText = this.interceptSearch ? alteredText : inputText;

    if (this.interceptSearch && !alteredText) {
      this.#listbox.hideResults();
      return;
    }

    this.#session.suggest(searchText, {
      ...this.options,
      ...this.#getCoreComponentOptions()
    });
    this.#eventManager.input(
      searchText,
      lastInput,
      {
        ...this.options,
        sessionToken: this.#session.sessionToken,
        accessToken: this.accessToken
      },
      this.#map,
      this.#search.responseHeaders
    );

    this.#setActionIcons(true);
  };

  #onHandleSelect = (
    e: MapboxHTMLEvent<SelectionEventDetail<GeocodingFeature>>
  ): void => {
    const { suggestion, selectedIndex } = e.detail;
    this.#session.retrieve(suggestion, this.options);
    this.#eventManager.select(
      this.value,
      selectedIndex,
      this.#listbox.suggestions,
      {
        ...this.options,
        sessionToken: this.#session.sessionToken,
        accessToken: this.accessToken
      },
      this.#map,
      this.#search.responseHeaders
    );

    this.#setActionIcons(true);
  };

  #onHandleBlur = (): void => {
    // Placeholder for any future listbox blur handling
  };

  #onHandleFocusOut = (event: FocusEvent): void => {
    // Only trigger when focus moves outside the Geocoder container
    if (
      !this.#binding.Geocoder.contains(event.relatedTarget as Node) &&
      !this.#listbox.contains(event.relatedTarget as Node)
    ) {
      this.#onHandleBlur();
      this.#listbox.hideResults();
      this.dispatchEvent(new MapboxHTMLEvent('blur'));
    }
  };

  #setActionIcons = (loading = false): void => {
    if (loading) {
      this.#binding.ClearBtn.style.display = 'none';
      this.#binding.LoadingIcon.style.display = 'block';
    } else {
      this.#binding.LoadingIcon.style.display = 'none';
      this.#binding.ClearBtn.style.display = this.value ? 'block' : 'none';
    }
  };

  #handleClear = (): void => {
    this.value = '';
    this.#setActionIcons();
    this.#handleMarker(null);
    this.#listbox.handleSuggest(null);
    this.#listbox.focus();

    this.#eventManager.clear();
    this.#session.incrementSession();

    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('clear'));
  };

  /** @section {Map settings} */

  /**
   * A [mapbox-gl](https://github.com/mapbox/mapbox-gl-js) instance to use when creating [Markers](https://docs.mapbox.com/mapbox-gl-js/api/#marker). Required if {@link MapboxGeocoder#marker} is `true`.
   *
   * @name mapboxgl
   * @instance
   * @memberof MapboxGeocoder
   */
  mapboxgl: typeof mapboxgl;

  /**
   * If `true`, a [Marker](https://docs.mapbox.com/mapbox-gl-js/api/#marker) will be added to the map at the location of the user-selected result using a default set of Marker options.  If the value is an object, the marker will be constructed using these options. If `false`, no marker will be added to the map. Requires that {@link MapboxGeocoder#mapboxgl} also be set.
   *
   * @name marker
   * @instance
   * @memberof MapboxGeocoder
   * @type {boolean | mapboxgl.MarkerOptions}
   * @example
   * ```typescript
   * search.marker = {
   *   color: 'red',
   *   draggable: true
   * };
   * ```
   */
  marker: boolean | mapboxgl.MarkerOptions = true;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#binding = bindElements<Binding>(this, {
      Geocoder: '.Geocoder',
      SearchIcon: '.SearchIcon',
      Input: '.Input',
      ClearBtn: '.ClearBtn',
      LoadingIcon: '.LoadingIcon'
    });

    // Initialize theme if not set before connectedCallback
    this.theme = { ...this.theme };

    const { Input, ClearBtn, Geocoder } = this.#binding;

    Geocoder.addEventListener('focusout', this.#onHandleFocusOut);

    this.#input = Input;
    this.#listbox.input = Input;
    this.#listbox.searchService = SEARCH_SERVICE.Geocoding;

    this.#listbox.addEventListener('input', this.#onHandleInput);
    this.#listbox.addEventListener('select', this.#onHandleSelect);
    this.#listbox.addEventListener('blur', this.#onHandleBlur);

    this.#session.addEventListener('suggest', this.#handleSuggest);
    this.#session.addEventListener('suggesterror', this.#handleSuggestError);
    this.#session.addEventListener('retrieve', this.#handleRetrieve);

    ClearBtn.addEventListener('click', this.#handleClear);

    this.placeholder = this.#placeholder;

    this.parentElement.appendChild(this.#listbox);

    if (Input) {
      // Remove any existing aria-live element that may be left over from, e.g., cloning the node
      if (Input.previousElementSibling.hasAttribute('aria-live')) {
        Input.previousElementSibling.remove();
      }
      Input.insertAdjacentElement(
        'beforebegin',
        createAriaLiveElement(this.#listbox.dataSeed)
      );
    }
  }

  disconnectedCallback(): void {
    const { Geocoder } = this.#binding;
    Geocoder.removeEventListener('focusout', this.#onHandleFocusOut);

    this.#listbox.remove();
    this.#listbox.input = null;

    this.#listbox.removeEventListener('input', this.#onHandleInput);
    this.#listbox.removeEventListener('select', this.#onHandleSelect);
    this.#listbox.removeEventListener('blur', this.#onHandleBlur);

    this.#session.removeEventListener('suggest', this.#handleSuggest);
    this.#session.removeEventListener('suggesterror', this.#handleSuggestError);
    this.#session.removeEventListener('retrieve', this.#handleRetrieve);

    this.#eventManager.remove();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string
  ): void {
    if (name === 'access-token') {
      this.#search.accessToken = newValue;
      return;
    }

    if (name === 'theme') {
      this.theme = tryParseJSON(newValue);
      return;
    }

    if (name === 'popover-options') {
      this.popoverOptions = tryParseJSON(newValue);
      return;
    }

    if (name === 'placeholder') {
      this.placeholder = newValue;
      return;
    }

    if (name === 'flip-coordinates') {
      this.componentOptions.flipCoordinates = ['true', ''].includes(newValue);
      return;
    }

    // Convert to the proper name for options.
    // Example: eta-type => eta_type
    const optionName = name.split('-').join('_');

    if (!newValue) {
      delete this.options[optionName];
    }

    // Otherwise, assume it's a Geocoding API option.
    this.options[optionName] = newValue;

    if (optionName === 'language') {
      this.placeholder = this.#placeholder;
    }
  }

  /** @section {Methods} */

  /**
   * Focuses the input element.
   */
  focus(): void {
    this.#listbox.focus();
  }

  /**
   * Sets the input text and triggers a search programmatically
   */
  search(text: string): void {
    this.value = text;
    const payload: InputEventDetail = {
      lastInput: text,
      inputText: text
    };
    this.#onHandleInput(new MapboxHTMLEvent('input', payload));
  }

  #handleMoveEnd = (): void => {
    const map = this.#map;
    const options = { ...this.options };

    if (map.getZoom() <= MAX_ZOOM) {
      delete options.proximity;
      this.options = options;

      return;
    }

    const center = map.getCenter();
    this.options = {
      ...options,
      proximity: center
    };
  };

  #fly = (feature: GeocodingFeature): void => {
    const map = this.#map;
    if (!map) {
      return;
    }

    const placeType = feature.properties.feature_type;

    let flyToOptions: mapboxgl.FlyToOptions;

    const bounds = feature.properties.bbox;
    if (bounds) {
      flyToOptions = bboxViewport(
        map,
        LngLatBounds.convert(bounds).toFlatArray()
      );
    } else {
      const center = feature.geometry.coordinates as mapboxgl.LngLatLike;
      const zoom = getMaxZoom(placeType);
      flyToOptions = {
        center,
        zoom,
        speed: FLY_TO_SPEED
      };
    }

    // If the user has set a custom flyTo option, merge it with the default options.
    flyToOptions = Object.assign(flyToOptions, this.componentOptions.flyTo);
    map.flyTo(flyToOptions);
  };

  /** @section {Map binding} */

  /**
   * Connects the Geocoder to a [Map](https://docs.mapbox.com/mapbox-gl-js/api/#map),
   * which handles both setting proximity and zoom after a suggestion click.
   *
   * @example
   * ```typescript
   * const search = new MapboxGeocoder();
   * search.bindMap(map);
   * ```
   */
  bindMap(map: mapboxgl.Map): void {
    if (this.#map) {
      this.#map.off('moveend', this.#handleMoveEnd);
    }

    if (map) {
      map.on('moveend', this.#handleMoveEnd);
    }

    this.#map = map;
  }

  /**
   * Unbinds the Geocoder from a [Map](https://docs.mapbox.com/mapbox-gl-js/api/#map).
   */
  unbindMap(): void {
    this.bindMap(null);
  }

  // IControl interface.

  // eslint-disable-next-line custom-elements/no-method-prefixed-with-on
  onAdd(map: mapboxgl.Map): HTMLElement {
    this.bindMap(map);
    this.remove();

    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl';
    container.style.width = '300px';
    container.appendChild(this);

    return container;
  }

  // eslint-disable-next-line custom-elements/no-method-prefixed-with-on
  onRemove(): void {
    this.remove();
    this.unbindMap();
    this.#removeMarker();
  }

  getDefaultPosition(): string {
    return 'top-right';
  }
}

declare global {
  interface Window {
    MapboxGeocoder: typeof MapboxGeocoder;
  }
}

window.MapboxGeocoder = MapboxGeocoder;

if (!window.customElements.get('mapbox-geocoder')) {
  customElements.define('mapbox-geocoder', MapboxGeocoder);
}
