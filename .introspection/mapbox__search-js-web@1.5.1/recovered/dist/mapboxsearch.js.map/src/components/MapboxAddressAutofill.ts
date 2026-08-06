import {
  AddressAutofillFeatureSuggestion,
  AddressAutofillOptions,
  AddressAutofillRetrieveResponse,
  AddressAutofillSuggestion,
  AddressAutofillSuggestionResponse,
  AddressAutofillCore,
  SearchSession
} from '@mapbox/search-js-core';

import {
  MapboxSearchListbox,
  SelectionEventDetail
} from './MapboxSearchListbox';
import { HTMLScopedElement } from './HTMLScopedElement';

import { tryParseJSON } from '../utils';
import {
  distinctExactStreetResults,
  fillFormWithFeature,
  toggleAutocompletion
} from '../utils/autofill';
import { tryConfirmBrowserAutofill } from '../utils/confirmation';

import { Theme } from '../theme';
import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { config } from '../config';
import { initDetectBrowserAutofill } from '../utils/detect_browser_autofill';
import { AddressConfirmOptions } from './MapboxAddressConfirmation';
import { PopoverOptions } from '../utils/popover';
import {
  createAriaLiveElement,
  suppressExtensionsAutocomplete
} from '../utils/aria';
import { handleStreetSelection } from '../utils/autofill';
import { SEARCH_SERVICE } from '../utils/services';
import { InputEventDetail } from '../utils/listbox';
import { MapboxEventManager } from '../events/MapboxEventManager';

export type MapboxSearchListboxAutofillType =
  MapboxSearchListbox<AddressAutofillSuggestion>;

type AddressAutofillEventTypes = {
  /**
   * Fired when the user is typing in the input and provides a list of suggestions.
   *
   * The underlying response from {@link AddressAutofillCore} is passed as the event's detail.
   *
   * @event suggest
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {AddressAutofillSuggestionResponse}
   * @example
   * ```typescript
   * autofill.addEventListener('suggest', (event) => {
   *   const suggestions = event.detail.suggestions;
   *   // ...
   * });
   * ```
   */
  suggest: MapboxHTMLEvent<AddressAutofillSuggestionResponse>;
  /**
   * Fired when {@link AddressAutofillCore} has errored providing a list of suggestions.
   *
   * The underlying error is passed as the event's detail.
   *
   * @event suggesterror
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {Error}
   * @example
   * ```typescript
   * autofill.addEventListener('suggesterror', (event) => {
   *   const error = event.detail;
   *   // ...
   * });
   * ```
   */
  suggesterror: MapboxHTMLEvent<Error>;
  /**
   * Fired when the user has selected a suggestion, before the form is autofilled.
   *
   * The underlying response from {@link AddressAutofillCore} is passed as the event's detail.
   *
   * @event retrieve
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {AddressAutofillRetrieveResponse}
   * @example
   * ```typescript
   * autofill.addEventListener('retrieve', (event) => {
   *   const featureCollection = event.detail;
   *   // ...
   * });
   * ```
   */
  retrieve: MapboxHTMLEvent<AddressAutofillRetrieveResponse>;
  /**
   * Fired when the user has changed the `<input>` text.
   *
   * The new input value is passed as the event's detail.
   *
   * @event input
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {string}
   * @example
   * ```typescript
   * autofill.addEventListener('input', (event) => {
   *   if (e.target !== e.currentTarget) return;
   *   const searchText = event.detail;
   *   // ...
   * });
   * ```
   */
  input: MapboxHTMLEvent<unknown>;
};

/**
 * `MapboxAddressAutofill`, also available as the element `<mapbox-address-autofill>`,
 * is an element that wraps an address [`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/text) element with
 * intelligent, location-aware autocomplete functionality.
 *
 * To use this element, you must have a [Mapbox access token](https://www.mapbox.com/help/create-api-access-token/).
 *
 * This element must be a descendant of a [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) element, and the form
 * must have inputs with proper HTML `autocomplete` attributes. If your application works with browser autofill, you may already have
 * this functionality.
 * - [The HTML autocomplete attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
 * - [Autofill](https://web.dev/learn/forms/autofill/)
 *
 * @class MapboxAddressAutofill
 * @example
 * <form>
 *   <mapbox-address-autofill access-token="YOUR_MAPBOX_ACCESS_TOKEN">
 *     <input type="text" name="address" autocomplete="shipping street-address" />
 *   </mapbox-address-autofill>
 * </form>
 */
export class MapboxAddressAutofill extends HTMLScopedElement<AddressAutofillEventTypes> {
  /**
   * This is read by the Web Components API to affect the
   * {@link MapboxAddressAutofill.attributeChangedCallback} below.
   *
   * All of these are passthroughs to the underlying {@link MapboxSearchListbox}.
   *
   * @ignore
   */
  static observedAttributes: string[] = [
    // Access token.
    'access-token',
    'browser-autofill-enabled',
    // Theming, CSS.
    'theme',
    'popover-options',
    'css-text',
    // Underlying Address Autofill API options.
    'language',
    'country',
    'bbox',
    'limit',
    'proximity',
    'streets'
  ];

  #autofill = new AddressAutofillCore();
  #session = new SearchSession<
    AddressAutofillOptions,
    AddressAutofillSuggestion,
    AddressAutofillSuggestionResponse,
    AddressAutofillRetrieveResponse
  >(this.#autofill);

  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   *
   * @name accessToken
   * @instance
   * @memberof MapboxAddressAutofill
   * @example
   * ```typescript
   * autofill.accessToken = 'pk.my-mapbox-access-token';
   * ```
   */
  get accessToken(): string {
    return this.#autofill.accessToken;
  }
  set accessToken(newToken: string) {
    this.#autofill.accessToken = newToken;
  }

  #input: HTMLInputElement;
  #listbox = new MapboxSearchListbox();

  #eventManager = new MapboxEventManager(SEARCH_SERVICE.AddressAutofill);

  #initialAutocompleteValue: string;

  /**
   * The `<input>` element wrapped by the autofill component.
   *
   * @name input
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {HTMLInputElement}
   */
  get input(): HTMLInputElement {
    return this.#input;
  }

  /**
   * Options to pass to the underlying {@link AddressAutofillCore} interface.
   *
   * @name options
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {AddressAutofillOptions}
   * @example
   * ```typescript
   * autofill.options = {
   *  language: 'en',
   *  country: 'US',
   * };
   * ```
   */
  options: Partial<AddressAutofillOptions> = {};

  /**
   * The {@link Theme} to use for styling the autofill component.
   *
   * @name theme
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {Theme}
   * @example
   * ```typescript
   * autofill.theme = {
   *   variables: {
   *     colorPrimary: 'myBrandRed'
   *   }
   * };
   * ```
   */
  get theme(): Theme {
    return this.#listbox.theme;
  }
  set theme(theme: Theme) {
    this.#listbox.theme = theme;
  }

  /**
   * The {@link PopoverOptions} to define popover positioning.
   *
   * @name popoverOptions
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {PopoverOptions}
   * @example
   * ```typescript
   * autofill.popoverOptions = {
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

  /**
   * If true, forms autofilled by the browser will prompt the
   * {@link confirmAddress} dialog for user confirmation.
   * An {@link AddressConfirmOptions} object can also be passed
   * to prompt {@link confirmAddress} with custom options.
   * Defaults to false.
   *
   * @name confirmOnBrowserAutofill
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {boolean | AddressConfirmOptions}
   * @example
   * ```typescript
   * autofill.confirmOnBrowserAutofill = {
   *   minimap: true,
   *   skipConfirmModal: (feature) =>
   *     ['exact', 'high'].includes(
   *       feature.properties.match_code.confidence
   *     )
   * };
   * ```
   */
  confirmOnBrowserAutofill: boolean | AddressConfirmOptions = false;

  #browserAutofillEnabled? = false;

  /**
   * Enables the browser's autocomplete popup to show during the first two typed characters while Mapbox results are suppressed. Defaults to false.
   *
   * **Note:** Due to varying specifications, efforts to suppress browser autocomplete behavior may not work on all browsers.
   *
   * @name browserAutofillEnabled
   * @instance
   * @memberof MapboxAddressAutofill
   * @type {boolean}
   * @example
   * ```typescript
   * autofill.browserAutofillEnabled = true;
   * ```
   */
  get browserAutofillEnabled(): boolean {
    return this.#browserAutofillEnabled;
  }
  set browserAutofillEnabled(enable: boolean) {
    this.#browserAutofillEnabled = enable;
  }

  #handleSuggest = (result: AddressAutofillSuggestionResponse): void => {
    const filteredSuggestions = result?.suggestions
      ? distinctExactStreetResults(result.suggestions)
      : null;
    this.#listbox.handleSuggest(filteredSuggestions);
    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('suggest', result));
  };

  #handleSuggestError = (error: Error): void => {
    this.#listbox.handleError();
    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('suggesterror', error));
  };

  #handleRetrieve = (result: AddressAutofillRetrieveResponse): void => {
    // Manually bubble up the event.
    this.dispatchEvent(new MapboxHTMLEvent('retrieve', result));

    this.retrieveFeature = result.features?.[0];

    if (!this.#input) {
      return;
    }

    const featureCollection = result;
    if (
      !featureCollection ||
      !featureCollection.features ||
      !featureCollection.features.length
    ) {
      return;
    }

    fillFormWithFeature(featureCollection.features[0], this.#input);
  };

  // Called when content changes.
  #handleObserve = (): void => {
    try {
      const input: HTMLInputElement = this.querySelector('input') ?? null;

      this.#input = input;
      this.#listbox.input = input;
      if (input) {
        input.addEventListener('blur', this.#onHandleInputBlur);
      }
    } catch (e) {
      this.#input = null;
      this.#listbox.input = null;

      console.error(e.message || e);
    }
  };

  #observer = new MutationObserver(this.#handleObserve);

  #handleBrowserAutofill = (e: CustomEvent): void => {
    // Hide listbox, if showing
    this.#listbox.blur();

    // Address confirmation
    tryConfirmBrowserAutofill(
      this.#input,
      e,
      this.confirmOnBrowserAutofill,
      this.accessToken
    );
  };

  retrieveFeature: AddressAutofillFeatureSuggestion = null;

  /**
   * A callback providing the opportunity to validate and/or manipulate the input text before it triggers a search, for example by using a regular expression.
   * If a truthy string value is returned, it will be passed into the underlying search API. If `null`, `undefined` or empty string is returned, no search request will be performed.
   *
   * @name interceptSearch
   * @instance
   * @memberof MapboxAddressAutofill
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

    // if following flag set to true and search text is equal or less than 2 characters - enable browser autofill.
    const enableBrowserAutocomplete =
      this.browserAutofillEnabled === true && inputText?.length <= 2;

    toggleAutocompletion(
      this.#input,
      this.#initialAutocompleteValue,
      enableBrowserAutocomplete
    );

    if (!inputText) {
      this.#handleClear();
      return;
    }

    const alteredText = this.interceptSearch && this.interceptSearch(inputText);

    const searchText = this.interceptSearch ? alteredText : inputText;

    if ((this.interceptSearch && !alteredText) || searchText?.length <= 2) {
      this.#listbox.handleSuggest(null);
      return;
    }

    this.#session.suggest(searchText, this.options);
    this.#eventManager.input(
      searchText,
      lastInput,
      {
        ...this.options,
        sessionToken: this.#session.sessionToken,
        accessToken: this.accessToken
      },
      null,
      this.#autofill.responseHeaders
    );
  };

  #onHandleSelect = (
    e: MapboxHTMLEvent<SelectionEventDetail<AddressAutofillSuggestion>>
  ): void => {
    const { suggestion, selectedIndex } = e.detail;
    if (suggestion.accuracy !== 'street') {
      toggleAutocompletion(this.#input, this.#initialAutocompleteValue, true);

      this.#session.retrieve(suggestion, this.options);
      this.#eventManager.select(
        this.input.value,
        selectedIndex,
        this.#listbox.suggestions,
        {
          ...this.options,
          sessionToken: this.#session.sessionToken,
          accessToken: this.accessToken
        },
        null,
        this.#autofill.responseHeaders
      );
    } else {
      handleStreetSelection(
        this.#input,
        this.#initialAutocompleteValue,
        suggestion
      );
    }
  };

  #onHandleBlur = (): void => {
    toggleAutocompletion(this.#input, this.#initialAutocompleteValue, true);
    // Abort any in-progress operations.
    this.#session.abort();
  };

  #onHandleInputBlur = (event: FocusEvent): void => {
    if (!this.#listbox.contains(event.relatedTarget as Node)) {
      this.#onHandleBlur();
      this.#listbox.hideResults();
    }
  };

  #onHandleFocus = (): void => {
    const enableBrowserAutocomplete =
      this.browserAutofillEnabled === true && this.#input.value?.length <= 2;
    toggleAutocompletion(
      this.#input,
      this.#initialAutocompleteValue,
      enableBrowserAutocomplete
    );
  };

  #handleClear = (): void => {
    this.#listbox.handleSuggest(null);
    this.#eventManager.clear();
  };

  connectedCallback(): void {
    super.connectedCallback();

    config.autofillSessionEnabled = true;
    this.#session.sessionToken = config.autofillSessionToken.id;

    this.#listbox.autofillHost = this;
    this.#listbox.searchService = SEARCH_SERVICE.AddressAutofill;

    const input: HTMLInputElement = this.querySelector('input') ?? null;

    // Setup observer handler.
    this.#observer.observe(this, {
      subtree: true,
      childList: true
    });

    this.#handleObserve();

    this.#listbox.addEventListener('input', this.#onHandleInput);
    this.#listbox.addEventListener('select', this.#onHandleSelect);
    this.#listbox.addEventListener('blur', this.#onHandleBlur);
    this.#listbox.addEventListener('focus', this.#onHandleFocus);

    this.#session.addEventListener('suggest', this.#handleSuggest);
    this.#session.addEventListener('suggesterror', this.#handleSuggestError);
    this.#session.addEventListener('retrieve', this.#handleRetrieve);

    document.body.appendChild(this.#listbox);

    if (input) {
      input.insertAdjacentElement(
        'beforebegin',
        createAriaLiveElement(this.#listbox.dataSeed)
      );
      suppressExtensionsAutocomplete(input);
      this.#initialAutocompleteValue = input.autocomplete;
    }

    // Setup browser autofill detection
    initDetectBrowserAutofill();
    window.addEventListener('browserautofill', this.#handleBrowserAutofill);
  }

  disconnectedCallback(): void {
    this.#listbox.remove();

    this.#listbox.removeEventListener('input', this.#onHandleInput);
    this.#listbox.removeEventListener('select', this.#onHandleSelect);
    this.#listbox.removeEventListener('blur', this.#onHandleBlur);
    this.#listbox.removeEventListener('focus', this.#onHandleFocus);

    this.#session.removeEventListener('suggest', this.#handleSuggest);
    this.#session.removeEventListener('suggesterror', this.#handleSuggestError);
    this.#session.removeEventListener('retrieve', this.#handleRetrieve);

    this.#eventManager.remove();

    this.#observer.disconnect();

    window.removeEventListener('browserautofill', this.#handleBrowserAutofill);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string
  ): void {
    if (name === 'access-token') {
      this.#autofill.accessToken = newValue;
      return;
    }

    if (name === 'browser-autofill-enabled') {
      this.#browserAutofillEnabled = Boolean(newValue);
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

    // Convert to the proper name for options.
    // Example: eta-type => eta_type
    const optionName = name.split('-').join('_');

    if (!newValue) {
      delete this.options[optionName];
    }

    // Otherwise, assume it's a Address Autofill API option.
    this.options[optionName] = newValue;
  }

  /** @section {Methods} */

  /**
   * Focuses the wrapped input element.
   */
  focus(): void {
    this.#listbox.focus();
  }

  /**
   * Trigger side effects from a retrieve event with a simulated result.
   * Used by {@link confirmAddress} when a suggested addresses is accepted.
   *
   * @ignore
   */
  simulateRetrieve(feature: AddressAutofillFeatureSuggestion): void {
    const input = this.input;
    if (input) {
      input.dataset['mapboxSuccess'] = 'true';
    }
    this.#listbox.hideResults();

    const simResult: AddressAutofillRetrieveResponse = {
      type: 'FeatureCollection',
      features: [feature],
      url: ''
    };

    this.#handleRetrieve(simResult);
  }
}

declare global {
  interface Window {
    MapboxAddressAutofill: typeof MapboxAddressAutofill;
  }
}

window.MapboxAddressAutofill = MapboxAddressAutofill;

if (!window.customElements.get('mapbox-address-autofill')) {
  customElements.define('mapbox-address-autofill', MapboxAddressAutofill);
}
