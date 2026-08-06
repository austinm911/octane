import {
  AddressAutofillFeatureSuggestion,
  AddressAutofillOptions,
  AddressAutofillRetrieveResponse,
  AddressAutofillSuggestion,
  AddressAutofillSuggestionResponse,
  Evented,
  AddressAutofillCore,
  SearchSession
} from '@mapbox/search-js-core';

import {
  MapboxSearchListbox,
  SelectionEventDetail
} from './components/MapboxSearchListbox';
import { MapboxHTMLEvent } from './MapboxHTMLEvent';
import { Theme } from './theme';
import { deepEquals } from './utils';
import {
  distinctExactStreetResults,
  fillFormWithFeature,
  findAddressInputs,
  toggleAutocompletion
} from './utils/autofill';
import { tryConfirmBrowserAutofill } from './utils/confirmation';

import { config } from './config';

import { initDetectBrowserAutofill } from './utils/detect_browser_autofill';
import { AddressConfirmOptions } from './components/MapboxAddressConfirmation';
import { PopoverOptions } from './utils/popover';
import {
  createAriaLiveElement,
  suppressExtensionsAutocomplete
} from './utils/aria';
import { handleStreetSelection } from './utils/autofill';
import { SEARCH_SERVICE } from './utils/services';
import { InputEventDetail } from './utils/listbox';
import { MapboxEventManager } from './events/MapboxEventManager';

/**
 * @class AddressAutofillInstance
 */
export class AddressAutofillInstance {
  #input: HTMLInputElement;

  get input(): HTMLInputElement {
    return this.#input;
  }

  #collection: AddressAutofillCollectionType;
  #session: SearchSession<
    AddressAutofillOptions,
    AddressAutofillSuggestion,
    AddressAutofillSuggestionResponse,
    AddressAutofillRetrieveResponse
  >;

  #autofillCoreRef: AddressAutofillCore;

  options: Partial<AddressAutofillOptions> = {};

  retrieveFeature: AddressAutofillFeatureSuggestion = null;

  listbox = new MapboxSearchListbox();

  #eventManager = new MapboxEventManager(SEARCH_SERVICE.AddressAutofill);

  constructor(
    collection: AddressAutofillCollectionType,
    input: HTMLInputElement,
    autofillRef: AddressAutofillCore
  ) {
    this.#input = input;
    this.#collection = collection;
    this.#session = new SearchSession<
      AddressAutofillOptions,
      AddressAutofillSuggestion,
      AddressAutofillSuggestionResponse,
      AddressAutofillRetrieveResponse
    >(autofillRef);
    this.#session.sessionToken = config.autofillSessionToken.id;

    this.#autofillCoreRef = autofillRef;

    this.listbox.input = this.#input;
    this.listbox.autofillHost = this;
    this.listbox.searchService = SEARCH_SERVICE.AddressAutofill;

    this.#input.addEventListener('blur', this.#onHandleInputBlur);

    this.listbox.addEventListener('input', this.#onHandleInput);
    this.listbox.addEventListener('select', this.#onHandleSelect);
    this.listbox.addEventListener('blur', this.#onHandleBlur);
    this.listbox.addEventListener('focus', this.#onHandleFocus);

    this.#session.addEventListener('suggest', this.#handleSuggest);
    this.#session.addEventListener('suggesterror', this.#handleSuggestError);
    this.#session.addEventListener('retrieve', this.#handleRetrieve);

    document.body.appendChild(this.listbox);

    if (input) {
      input.insertAdjacentElement(
        'beforebegin',
        createAriaLiveElement(this.listbox.dataSeed)
      );
      suppressExtensionsAutocomplete(input);
      this.#initialAutocompleteValue = input.autocomplete;
    }
  }

  remove(): void {
    this.listbox.remove();

    this.#input.removeEventListener('blur', this.#onHandleInputBlur);

    this.listbox.removeEventListener('input', this.#onHandleInput);
    this.listbox.removeEventListener('select', this.#onHandleSelect);
    this.listbox.removeEventListener('blur', this.#onHandleBlur);
    this.listbox.removeEventListener('focus', this.#onHandleFocus);

    this.#session.removeEventListener('suggest', this.#handleSuggest);
    this.#session.removeEventListener('suggesterror', this.#handleSuggestError);
    this.#session.removeEventListener('retrieve', this.#handleRetrieve);
  }

  #initialAutocompleteValue: string;

  #onHandleInput = (e: MapboxHTMLEvent<InputEventDetail>): void => {
    const { lastInput, inputText } = e.detail;

    // if following flag set to true and search text is equal or less than 2 characters - enable browser autofill.
    const enableBrowserAutocomplete =
      this.#collection.browserAutofillEnabled === true &&
      inputText?.length <= 2;

    toggleAutocompletion(
      this.#input,
      this.#initialAutocompleteValue,
      enableBrowserAutocomplete
    );

    if (!inputText) {
      this.#handleClear();
      return;
    }

    if (inputText?.length <= 2) {
      this.listbox.handleSuggest(null);
      return;
    }

    this.#session.suggest(inputText, this.options);
    this.#eventManager.input(
      inputText,
      lastInput,
      {
        ...this.options,
        sessionToken: this.#session.sessionToken,
        accessToken: this.#collection.accessToken
      },
      null,
      this.#autofillCoreRef.responseHeaders
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
        this.listbox.suggestions,
        {
          ...this.options,
          sessionToken: this.#session.sessionToken,
          accessToken: this.#collection.accessToken
        },
        null,
        this.#autofillCoreRef.responseHeaders
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
    if (!this.listbox.contains(event.relatedTarget as Node)) {
      this.#onHandleBlur();
      this.listbox.hideResults();
    }
  };

  #onHandleFocus = (): void => {
    const enableBrowserAutocomplete =
      this.#collection.browserAutofillEnabled === true &&
      this.#input.value?.length <= 2;
    toggleAutocompletion(
      this.#input,
      this.#initialAutocompleteValue,
      enableBrowserAutocomplete
    );
  };

  #handleClear = (): void => {
    this.listbox.handleSuggest(null);
    this.#eventManager.clear();
  };

  #handleSuggest = (result: AddressAutofillSuggestionResponse): void => {
    const filteredSuggestions = result?.suggestions
      ? distinctExactStreetResults(result.suggestions)
      : null;
    this.listbox.handleSuggest(filteredSuggestions);
    // Manually bubble up the event.
    const event = new MapboxHTMLEvent('suggest', result);
    Object.defineProperty(event, 'target', { value: this.#input });
    this.#collection.fire('suggest', event);
  };

  #handleSuggestError = (error: Error): void => {
    this.listbox.handleError();
    // Manually bubble up the event.
    const event = new MapboxHTMLEvent('suggesterror', error);
    Object.defineProperty(event, 'target', { value: this.#input });
    this.#collection.fire('suggesterror', event);
  };

  #handleRetrieve = (result: AddressAutofillRetrieveResponse): void => {
    const event = new MapboxHTMLEvent('retrieve', result);
    // Manually bubble up the event.
    Object.defineProperty(event, 'target', { value: this.#input });
    this.#collection.fire('retrieve', event);

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

  simulateRetrieve(feature: AddressAutofillFeatureSuggestion): void {
    const input = this.#input;
    if (input) {
      input.dataset['mapboxSuccess'] = 'true';
    }
    this.listbox.hideResults();

    const simResult: AddressAutofillRetrieveResponse = {
      type: 'FeatureCollection',
      features: [feature],
      url: ''
    };

    this.#handleRetrieve(simResult);
  }
}

/**
 * Object defining options for Address Autofill search behavior and UI. Used to configure {@link AddressAutofillCollection}
 * @typedef AddressAutofillCollectionOptions
 */
export interface AddressAutofillCollectionOptions {
  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   */
  accessToken?: string;
  /**
   * Options to pass to the underlying {@link AddressAutofillCore} interface.
   */
  options?: Partial<AddressAutofillOptions>;
  /**
   * The {@link Theme} to use for styling the autofill component.
   */
  theme?: Theme;
  /**
   * The {@link PopoverOptions} to define popover positioning.
   */
  popoverOptions?: Partial<PopoverOptions>;
  /**
   * If true, forms autofilled by the browser will prompt the
   * {@link confirmAddress} dialog for user confirmation.
   * An {@link AddressConfirmOptions} object can also be passed
   * to prompt {@link confirmAddress} with custom options.
   * Defaults to false.
   */
  confirmOnBrowserAutofill?: boolean | AddressConfirmOptions;
  /**
   * Enables the browser's autocomplete popup to show during the first two typed characters while Mapbox results are suppressed. Defaults to false.
   *
   * **Note:** Due to varying specifications, efforts to suppress browser autocomplete behavior may not work on all browsers.
   */
  browserAutofillEnabled?: boolean;
}

interface EventTypes<
  AddressAutofillSuggestionResponse,
  AddressAutofillRetrieveResponse
> {
  /**
   * Fired when the user is typing in the input and provides a list of suggestions.
   *
   * The underlying response from {@link AddressAutofillCore} is passed as the event's detail,
   * while the responsible input is passed as the event's target.
   *
   * @event suggest
   * @instance
   * @memberof AddressAutofillCollection
   * @type {AddressAutofillSuggestionResponse}
   * @example
   * ```typescript
   * collection.addEventListener('suggest', (event) => {
   *   const suggestions = event.detail.suggestions;
   *   const inputEl = event.target;
   *   // ...
   * });
   * ```
   */
  suggest: MapboxHTMLEvent<AddressAutofillSuggestionResponse>;
  /**
   * Fired when {@link AddressAutofillCore} has errored providing a list of suggestions.
   *
   * The underlying error is passed as the event's detail,
   * while the responsible input is passed as the event's target.
   *
   * @event suggesterror
   * @instance
   * @memberof AddressAutofillCollection
   * @type {Error}
   * @example
   * ```typescript
   * collection.addEventListener('suggesterror', (event) => {
   *   const error = event.detail;
   *   const inputEl = event.target;
   *   // ...
   * });
   * ```
   */
  suggesterror: MapboxHTMLEvent<Error>;
  /**
   * Fired when the user has selected a suggestion, before the form is autofilled.
   *
   * The underlying response from {@link AddressAutofillCore} is passed as the event's detail,
   * while the responsible input is passed as the event's target.
   *
   * @event retrieve
   * @instance
   * @memberof AddressAutofillCollection
   * @type {AddressAutofillRetrieveResponse}
   * @example
   * ```typescript
   * autofill.addEventListener('retrieve', (event) => {
   *   const featureCollection = event.detail;
   *   const inputEl = event.target;
   *   // ...
   * });
   * ```
   */
  retrieve: MapboxHTMLEvent<AddressAutofillRetrieveResponse>;
}

export type AddressAutofillCollectionType = AddressAutofillCollection<
  AddressAutofillSuggestionResponse,
  AddressAutofillRetrieveResponse
>;

/**
 * Underlying collection object class returned by the {@link autofill} function.
 *
 * @class AddressAutofillCollection
 */
export class AddressAutofillCollection<
  AddressAutofillSuggestionResponse,
  AddressAutofillRetrieveResponse
> extends Evented<
  EventTypes<AddressAutofillSuggestionResponse, AddressAutofillRetrieveResponse>
> {
  instances: AddressAutofillInstance[] = [];
  #currentInputs: HTMLInputElement[];

  #autofill = new AddressAutofillCore();

  constructor({
    accessToken,
    options,
    theme,
    popoverOptions,
    confirmOnBrowserAutofill,
    browserAutofillEnabled
  }: AddressAutofillCollectionOptions) {
    super();

    // Setup browser autofill detection
    initDetectBrowserAutofill();
    window.addEventListener('browserautofill', this.#handleBrowserAutofill);

    config.autofillSessionEnabled = true;

    this.accessToken = accessToken || config.accessToken;
    options && (this.options = options);
    theme && (this.theme = theme);
    popoverOptions && (this.popoverOptions = popoverOptions);
    confirmOnBrowserAutofill &&
      (this.confirmOnBrowserAutofill = confirmOnBrowserAutofill);
    browserAutofillEnabled &&
      (this.browserAutofillEnabled = browserAutofillEnabled);
    this.update();
  }

  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   *
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

  #options: Partial<AddressAutofillOptions>;

  /**
   * Options to pass to the underlying {@link AddressAutofillCore} interface.
   *
   * @example
   * ```typescript
   * autofill.options = {
   *  language: 'en',
   *  country: 'US',
   * };
   * ```
   */
  get options(): Partial<AddressAutofillOptions> {
    return this.#options;
  }
  set options(newOptions: Partial<AddressAutofillOptions>) {
    this.#options = { ...this.#options, ...newOptions };
    this.instances.forEach((instance) => {
      instance.options = { ...instance.options, ...newOptions };
    });
  }

  #theme: Theme;

  /**
   * The {@link Theme} to use for styling the autofill component.
   *
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
    return this.#theme;
  }
  set theme(newTheme: Theme) {
    this.#theme = newTheme;
    this.instances.forEach((instance) => {
      instance.listbox.theme = newTheme;
    });
  }

  #popoverOptions: Partial<PopoverOptions>;

  /**
   * The {@link PopoverOptions} to define popover positioning.
   *
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
    return this.#popoverOptions;
  }
  set popoverOptions(newOptions: Partial<PopoverOptions>) {
    this.#popoverOptions = newOptions;
    this.instances.forEach((instance) => {
      instance.listbox.popoverOptions = newOptions;
    });
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
   * @memberof AddressAutofillCollection
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

  /**
   * Enables the browser's autocomplete popup to show during the first two typed characters while Mapbox results are suppressed. Defaults to false.
   *
   * **Note:** Due to varying specifications, efforts to suppress browser autocomplete behavior may not work on all browsers.
   *
   * @name browserAutofillEnabled
   * @instance
   * @memberof AddressAutofillCollection
   * @type {boolean}
   * @example
   * ```typescript
   * autofill.browserAutofillEnabled = true;
   * ```
   */
  browserAutofillEnabled?: boolean = false;

  /** @section {Methods} */

  /**
   * Updates autofill collection based on the current DOM state.
   * @example
   * ```typescript
   * collection.update();
   * ```
   */
  update(): void {
    // STEP 0: Remove and clean up any existing autofill instances
    this.instances.forEach((instance) => {
      instance.remove();
    });
    // STEP 1: Find the input element(s)
    this.#currentInputs = findAddressInputs();
    // STEP 2: Create a new autofill instance for each input
    this.instances = [];
    this.#currentInputs.forEach((input) => {
      const autofillInstance = new AddressAutofillInstance(
        this,
        input,
        this.#autofill
      );
      autofillInstance.options = this.options;
      autofillInstance.listbox.theme = this.theme;
      autofillInstance.listbox.popoverOptions = this.popoverOptions;
      this.instances.push(autofillInstance);
    });
  }

  // TODO: optimize this!
  // Called when content changes.
  #handleObserve = (): void => {
    // TODO: add test to make sure this comparison works
    if (!deepEquals(findAddressInputs(), this.#currentInputs)) {
      this.update();
    }
  };

  #observer = new MutationObserver(this.#handleObserve);

  /**
   * Listen for changes to the DOM, and update autofill instances when autofill-able inputs are added/removed.
   *
   * **IMPORTANT:** For performance reasons, it is recommended to carefully control
   * when this is called and to call {@link AddressAutofillCollection#unobserve} when finished.
   *
   * @example
   * ```typescript
   * collection.observe();
   * ```
   */
  observe(): void {
    // Setup observer handler.
    this.#observer.observe(document, {
      subtree: true,
      childList: true
    });

    this.#handleObserve();
  }

  /**
   * Stop listening for changes to the DOM. This only has an effect if called
   * after {@link AddressAutofillCollection#observe}.
   *
   * @example
   * ```typescript
   * collection.unobserve();
   * ```
   */
  unobserve(): void {
    this.#observer.disconnect();
  }

  /**
   * Removes all autofill instances and listeners in the document.
   *
   * @example
   * ```typescript
   * collection.remove();
   * ```
   */
  remove(): void {
    this.instances.forEach((instance) => {
      instance.remove();
    });
    this.unobserve();
    window.removeEventListener('browserautofill', this.#handleBrowserAutofill);
  }

  #handleBrowserAutofill = async (e: CustomEvent): Promise<void> => {
    // Hide listbox, if showing
    this.instances.forEach((instance) => instance.listbox.blur());

    // Address confirmation
    for (const instance of this.instances) {
      const input = instance.listbox.input;
      await tryConfirmBrowserAutofill(
        input,
        e,
        this.confirmOnBrowserAutofill,
        this.accessToken
      );
    }
  };
}

/**
 * Entry point for Mapbox Address Autofill, for use on standard HTML input elements.
 *
 * Compared to {@link MapboxAddressAutofill}, this function automatically attaches
 * to eligible [`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/text) elements in-place.
 *
 * You must have a [Mapbox access token](https://www.mapbox.com/help/create-api-access-token/).
 *
 * Eligible inputs must be a descendant of a [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) element, and the form
 * must have inputs with proper HTML `autocomplete` attributes. The input itself must be of autocomplete `"street-address"` or `"address-line1""`.
 *
 * If your application works with browser autofill, you may already have this functionality.
 * - [The HTML autocomplete attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
 * - [Autofill](https://web.dev/learn/forms/autofill/)
 *
 * @param optionsArg - {@link AddressAutofillCollectionOptions} Object defining options for Address Autofill search behavior and UI.
 * @example
 * <input type="text" autocomplete="street-address" />
 * <script>
 * mapboxsearch.autofill({
 *   accessToken: 'pk.my.token',
 *   options: { country: 'us' }
 * };
 * </script>
 * @example
 * ```typescript
 * const collection = autofill({
 *   accessToken: 'pk.my.token',
 *   options
 * })
 *
 * myClientSideRouter.on('route', () => collection.update());
 * ```
 */
export function autofill(
  optionsArg: AddressAutofillCollectionOptions
): AddressAutofillCollectionType {
  return new AddressAutofillCollection(optionsArg);
}
