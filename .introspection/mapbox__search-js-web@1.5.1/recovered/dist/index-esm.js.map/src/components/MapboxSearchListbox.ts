import {
  SearchBoxSuggestion,
  AddressAutofillSuggestion,
  GeocodingFeature
} from '@mapbox/search-js-core';

import { HTMLScopedElement } from './HTMLScopedElement';

import { Theme, getThemeCSS, getIcon } from '../theme';
import { bindElements, getChildElements } from '../utils/dom';
import { Popover, PopoverOptions } from '../utils/popover';

import style from '../style.css';
import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { MapboxAddressAutofill } from './MapboxAddressAutofill';
import { AddressAutofillInstance } from '../autofill';
import { getAriaMessage, setLiveRegionMessage } from '../utils/aria';
import { LISTBOX_TEMPLATE, LISTBOX_SUGGESTION_TEMPLATE } from '../constants';
import {
  InputEventDetail,
  buildSuggestionDescription,
  getSuggestionTitle
} from '../utils/listbox';
import { SEARCH_SERVICE } from '../utils/services';

function getAriaIdForSuggestion(resultListId: string, i: number): string {
  return `${resultListId}-${i}`;
}

type Binding = {
  /**
   * Wrapper around the entire component.
   */
  MapboxSearch: HTMLElement;
  /**
   * Results container, which contains:
   * - {@link ResultsList}
   * - {@link Label}
   * - Attribution.
   */
  Results: HTMLDivElement;
  /**
   * Exposed as a listbox to assistive technologies.
   */
  ResultsList: HTMLUListElement;
  /**
   * Exposed as a label.
   *
   * Visually hidden but can "announce" the current selection to
   * assistive technologies.
   */
  Label: HTMLDivElement;
};

/**
 * Event detail object for the `select` event.
 */
export type SelectionEventDetail<Suggestion> = {
  suggestion: Suggestion;
  selectedIndex: number;
};

type ListboxEventTypes<Suggestion> = {
  /**
   * Triggered on `input` events, i.e. typing  in the `<input>` element.
   */
  input: MapboxHTMLEvent<InputEventDetail>;
  /**
   * Triggered on selection events, i.e. clicking on an item in the results list
   * or hitting `Enter` with an item highlighted.
   */
  select: MapboxHTMLEvent<SelectionEventDetail<Suggestion>>;
  /**
   * Triggered on `blur` event, i.e. focus moves away from the `<input>` element.
   */
  blur: MapboxHTMLEvent<unknown>;
  /**
   * Triggered on `focus` evenet, i.e. focus moves onto the `<input>` element.
   */
  focus: MapboxHTMLEvent<unknown>;
};

export class MapboxSearchListbox<
  Suggestion extends
    | SearchBoxSuggestion
    | AddressAutofillSuggestion
    | GeocodingFeature
> extends HTMLScopedElement<ListboxEventTypes<Suggestion>> {
  protected override get template(): HTMLTemplateElement {
    return LISTBOX_TEMPLATE;
  }

  protected override get templateStyle(): string {
    return style;
  }

  protected get templateUserStyle(): string {
    return getThemeCSS('.MapboxSearch', this.theme);
  }

  /**
   * The current list of suggestions to be rendered in the results box.
   */
  suggestions: Suggestion[] | null = null;

  /**
   * The Address Autofill instance driving the listbox.
   * Can be either the custom element or function.
   */
  autofillHost?: MapboxAddressAutofill | AddressAutofillInstance;

  #popover: Popover | null = null;

  #binding: Binding;

  #labelID: string;
  #resultListID: string;

  #inputInternal: HTMLInputElement | null;

  dataSeed: string;

  get input(): HTMLInputElement | null {
    return this.#inputInternal;
  }

  set input(newInput: HTMLInputElement | null) {
    const oldInput = this.#inputInternal;

    if (oldInput) {
      oldInput.removeEventListener('input', this.#handleInput);
      oldInput.removeEventListener('focus', this.#handleFocus);
      oldInput.removeEventListener('blur', this.#handleBlur);
      oldInput.removeEventListener('keydown', this.#handleKeyDown);

      if (this.#popover) {
        this.#popover.destroy();
      }
    }

    if (newInput) {
      newInput.addEventListener('input', this.#handleInput);
      newInput.addEventListener('focus', this.#handleFocus);
      newInput.addEventListener('blur', this.#handleBlur);
      newInput.addEventListener('keydown', this.#handleKeyDown);

      // Set ARIA role and attributes.
      newInput.setAttribute('role', 'combobox');
      newInput.setAttribute('aria-autocomplete', 'list');
      newInput.setAttribute('aria-controls', this.#resultListID);

      if (this.isConnected) {
        this.#popover = new Popover(
          newInput,
          this.#binding.Results,
          this.popoverOptions
        );
      }
    }

    this.#inputInternal = newInput;
  }

  #searchService = null;

  get searchService(): SEARCH_SERVICE | null {
    return this.#searchService;
  }

  set searchService(service: SEARCH_SERVICE) {
    this.#searchService = service;
  }

  #selectedIndexInternal = undefined;

  get selectedIndex(): number | undefined {
    return this.#selectedIndexInternal;
  }

  set selectedIndex(newIndex: number) {
    const oldIndex = this.#selectedIndexInternal;
    this.#selectedIndexInternal = newIndex;

    // Update accessibility flags.
    const { ResultsList } = this.#binding;

    const id = getAriaIdForSuggestion(this.#resultListID, newIndex);

    if (newIndex !== undefined) {
      this.input.setAttribute('aria-activedescendant', id);
      ResultsList.setAttribute('aria-activedescendant', id);
    } else {
      this.input.removeAttribute('aria-activedescendant');
      ResultsList.removeAttribute('aria-activedescendant');
    }

    // Update the selected suggestion.
    if (oldIndex !== newIndex) {
      const oldId = getAriaIdForSuggestion(this.#resultListID, oldIndex);
      const oldEl = ResultsList.querySelector(`#${oldId}`);
      oldEl?.removeAttribute('aria-selected');
      oldEl?.setAttribute('tabindex', '-1');

      if (newIndex !== undefined) {
        const el = ResultsList.querySelector(`#${id}`) as HTMLElement;
        el?.setAttribute('aria-selected', 'true');
        el?.setAttribute('tabindex', '0');
        // TODO: uncomment after moving hideResults logic out from handleBlur and delete aria-activedescendant logic
        // el?.focus();
      }
    }

    this.renderAriaMessage();
  }

  #showResults(): void {
    if (!this.suggestions || !this.suggestions.length) {
      return;
    }

    const { Results, MapboxSearch } = this.#binding;

    // Calculate width, enable display
    const rect = this.input.getBoundingClientRect();
    MapboxSearch.style.setProperty('--width', `${rect.width}px`);
    MapboxSearch.style.setProperty('display', 'block');

    // Update accessibility flags.
    this.input.setAttribute('aria-expanded', 'true');
    Results.removeAttribute('aria-hidden');
    // Reset selected index.
    this.selectedIndex = undefined;
  }

  hideResults(): void {
    const { Results, ResultsList } = this.#binding;

    // Update accessibility flags.
    Results.setAttribute('aria-hidden', 'true');
    this.input.setAttribute('aria-expanded', 'false');
    ResultsList.removeAttribute('aria-activedescendant');
    this.input.removeAttribute('aria-activedescendant');
  }

  renderItem(i: number): HTMLElement {
    const element = this.prepareTemplate(LISTBOX_SUGGESTION_TEMPLATE);
    element.id = getAriaIdForSuggestion(this.#resultListID, i);

    return element;
  }

  fillItem(
    el: Element,
    item: Suggestion,
    i: number,
    totalLength: number
  ): void {
    const iconEl = el.querySelector('[class$="SuggestionIcon"]');
    const nameEl = el.querySelector('[class$="SuggestionName"]');
    const descriptionEl = el.querySelector('[class$="SuggestionDesc"]');

    // For Autofill suggestions, use 'accuracy' property to generate icon
    if (this.searchService === SEARCH_SERVICE.AddressAutofill) {
      iconEl.innerHTML = getIcon(
        (item as AddressAutofillSuggestion).accuracy === 'street'
          ? 'street'
          : 'addressMarker',
        this.theme
      );
      iconEl.removeAttribute('aria-hidden');
    } else {
      iconEl.setAttribute('aria-hidden', 'true');
    }

    // reset previous values
    nameEl.textContent = descriptionEl.textContent = '';

    nameEl.textContent = getSuggestionTitle(item, this.searchService);

    descriptionEl.textContent = buildSuggestionDescription(
      item,
      this.searchService
    );

    if (i === this.selectedIndex) {
      el.setAttribute('aria-selected', 'true');
    } else {
      el.removeAttribute('aria-selected');
    }

    el.setAttribute('aria-posinset', (i + 1).toString());
    el.setAttribute('aria-setsize', totalLength.toString());
  }

  #renderResultsList(): void {
    const { ResultsList } = this.#binding;

    if (!this.suggestions || !this.suggestions.length) {
      // Speed optimization?
      ResultsList.innerHTML = '';
      this.hideResults();
      return;
    }

    /**
     * Make sure we have the correct number of nodes.
     */
    const elements = getChildElements(ResultsList);
    // Too few, add any we're missing.
    if (this.suggestions.length > elements.length) {
      for (let i = elements.length; i < this.suggestions.length; i++) {
        const item = this.renderItem(i);
        elements.push(item);

        // Setup selected index listener.
        item.onmouseenter = () => {
          this.selectedIndex = i;
        };
        item.onmouseleave = () => {
          this.selectedIndex = undefined;
        };

        ResultsList.appendChild(item);
      }
    }

    // Too many, remove any we're not using anymore.
    if (this.suggestions.length < elements.length) {
      for (let i = this.suggestions.length; i < elements.length; i++) {
        elements[i].remove();
      }
    }

    /**
     * Fill out DOM nodes with our data.
     */
    for (let i = 0; i < this.suggestions.length; i++) {
      const suggestion = this.suggestions[i];
      const element = elements[i];

      this.fillItem(element, suggestion, i, this.suggestions.length);
      // Override 'onclick' for autofill.
      element.onclick = () => {
        this.#handleSelect(suggestion, i);
      };
    }
  }

  #themeInternal: Theme = {};

  get theme(): Theme {
    return this.#themeInternal;
  }

  set theme(theme: Theme) {
    this.#themeInternal = theme;

    if (!this.#binding || !theme) {
      return;
    }

    this.updateTemplateUserStyle(getThemeCSS('.MapboxSearch', theme));
  }

  #popoverOptions: Partial<PopoverOptions> = {};

  get popoverOptions(): Partial<PopoverOptions> {
    return this.#popoverOptions;
  }

  set popoverOptions(newOptions: Partial<PopoverOptions>) {
    this.#popoverOptions = newOptions;
    if (this.#popover) {
      this.#popover.options = newOptions;
      this.#popover.update();
    }
  }

  #handleInput = (e: InputEvent): void => {
    // Prevent duping requests.
    const { Results } = this.#binding;
    const input = e.target as HTMLInputElement;

    if (input.dataset['mapboxSuccess']) {
      delete input.dataset['mapboxSuccess'];
      return;
    }

    const searchText = input.value;

    this.renderAriaMessage();

    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy
    Results.setAttribute('aria-busy', 'true');

    this.dispatchEvent(
      new MapboxHTMLEvent<InputEventDetail>('input', {
        lastInput: e.data,
        inputText: searchText
      })
    );
  };

  renderAriaMessage = (): void => {
    const message = getAriaMessage(
      this.input?.value,
      this.suggestions,
      this.selectedIndex
    );
    setLiveRegionMessage(message, this.dataset.seed);
  };

  clearAriaMessage = (): void => {
    setLiveRegionMessage('', this.dataset.seed);
  };

  /**
   * Handles the rendering of suggestion items returned from the input text search.
   * @param suggestions Array of suggestions or features returned from the search
   */
  handleSuggest = (suggestions: Suggestion[]): void => {
    this.suggestions = suggestions;

    if (!suggestions || suggestions.length === 0) {
      this.renderAriaMessage();
    }

    if (!suggestions) {
      this.hideResults();
      return;
    }

    this.#renderResultsList();
    if (suggestions.length) {
      this.#showResults();
    }

    const { Results } = this.#binding;
    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy
    Results.setAttribute('aria-busy', 'false');
  };

  /**
   * Handles the results box rendering when an error has occurred.
   */
  handleError = (): void => {
    const { Results } = this.#binding;
    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy
    Results.setAttribute('aria-busy', 'false');

    this.hideResults();
  };

  #handleSelect = async (
    suggestion: Suggestion,
    selectedIndex: number
  ): Promise<void> => {
    // set mapboxSuccess to 'true'
    const input = this.input;
    if (input) {
      input.dataset['mapboxSuccess'] = 'true';
    }

    const payload: SelectionEventDetail<Suggestion> = {
      suggestion,
      selectedIndex
    };

    this.dispatchEvent(new MapboxHTMLEvent('select', payload));

    this.hideResults();
  };

  #handleFocus = (): void => {
    const input = this.input;
    delete input.dataset['mapboxSuccess'];

    this.dispatchEvent(new MapboxHTMLEvent('focus'));
    this.renderAriaMessage();
    this.#showResults();
  };

  #handleBlur = (): void => {
    // See if we're the target.
    if (document.activeElement === this.input) {
      return;
    }

    this.dispatchEvent(new MapboxHTMLEvent('blur'));
    this.clearAriaMessage();
  };

  #handleFocusOut = (event: FocusEvent): void => {
    // Only trigger when focus moves outside the Listbox container
    if (!this.#binding.MapboxSearch.contains(event.relatedTarget as Node)) {
      this.hideResults();
    }
  };

  handleArrowUp = (): void => {
    if (this.selectedIndex === undefined) {
      this.selectedIndex = this.suggestions.length - 1;
    } else if (this.selectedIndex === 0) {
      this.selectedIndex = undefined;
    } else {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
  };

  handleArrowDown = (): void => {
    if (this.selectedIndex === undefined) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex === this.suggestions.length - 1) {
      this.selectedIndex = undefined;
    } else {
      this.selectedIndex = Math.min(
        this.selectedIndex + 1,
        this.suggestions.length - 1
      );
    }
  };

  #handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.suggestions?.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.handleArrowDown();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.handleArrowUp();
      return;
    }

    if (e.key === 'Escape') {
      this.hideResults();
      return;
    }

    if (this.selectedIndex === undefined) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      this.#handleSelect(
        this.suggestions[this.selectedIndex],
        this.selectedIndex
      );
      return;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();

    this.dataSeed = this.dataset.seed;

    this.#labelID = this.dataset.seed + '-Label';
    this.#resultListID = this.dataset.seed + '-ResultsList';

    if (this.input) {
      this.input.setAttribute('aria-controls', this.#resultListID);
    }

    this.#binding = bindElements<Binding>(this, {
      MapboxSearch: '.MapboxSearch',
      Results: '.Results',
      ResultsList: '.ResultsList',
      Label: '.Label'
    });

    const { Results, ResultsList, Label } = this.#binding;

    Label.id = this.#labelID;
    ResultsList.id = this.#resultListID;
    ResultsList.setAttribute('aria-labelledby', this.#labelID);

    Results.addEventListener('focusout', this.#handleFocusOut);

    if (!this.#popover && this.input) {
      this.#popover = new Popover(
        this.input,
        this.#binding.Results,
        this.popoverOptions
      );
    }

    // Update popover on next frame.
    requestAnimationFrame(() => {
      if (this.#popover) {
        this.#popover.update();
      }
    });
  }

  disconnectedCallback(): void {
    // Make sure to unbind input listeners.
    this.input = null;

    const { Results } = this.#binding;
    Results.removeEventListener('focusout', this.#handleFocusOut);

    if (this.#popover) this.#popover.destroy();
  }

  focus(): void {
    // Refire the event internally, in case we missed it
    // and the end user is trying to replay it.
    if (document.activeElement === this.input) {
      this.#handleFocus();
    } else {
      this.input.focus();
    }
  }

  blur(): void {
    this.input.blur();
  }

  updatePopover(): void {
    if (this.#popover) {
      this.#popover.update();
    }
  }
}

declare global {
  interface Window {
    MapboxSearchListbox: typeof MapboxSearchListbox;
  }
}

window.MapboxSearchListbox = MapboxSearchListbox;

if (!window.customElements.get('mapbox-search-listbox')) {
  customElements.define('mapbox-search-listbox', MapboxSearchListbox);
}
