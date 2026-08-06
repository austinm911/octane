import {
  AddressAutofillSuggestion,
  GeocodingFeature,
  SearchBoxSuggestion
} from '@mapbox/search-js-core';
import {
  getSuggestionSelectedMessage,
  getSuggestionsReadyMessage,
  KEYBOARD_NAVIGATION_GUIDE_MESSAGE,
  LENGTH_MESSAGE,
  NO_SEARCH_RESULTS_MESSAGE
} from './messages';
/**
 * This is to make sure our custom "buttons" have appropriate
 * keyboard controls for WAI-ARIA.
 *
 * Reference: https://www.w3.org/TR/wai-aria-practices-1.1/#keyboard-interaction-3
 */
export function ariaButtonKeyDown(e: KeyboardEvent): void {
  const el = e.currentTarget as HTMLElement;

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();

    // Simulate a click event.
    el.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        composed: true
      })
    );
  }
}

const ARIA_DESCRIPTION_ID = 'search-listbox__description';

/**
 * Builds element that may contain different messages for VoiceOver utilities.
 * The element has necessary aria-* specific attributes and visually hidden.
 */
export const createAriaLiveElement = (seed: string): HTMLDivElement => {
  const container = document.createElement('div');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  container.setAttribute('role', 'status');
  container.setAttribute(
    'style',
    'border: 0px;clip: rect(0px, 0px, 0px, 0px);height: 1px;margin-bottom: -1px;margin-right: -1px;overflow: hidden;padding: 0px;position: absolute;white-space: nowrap;width: 1px;'
  );

  const description = document.createElement('div');
  description.setAttribute('id', `${seed}--${ARIA_DESCRIPTION_ID}`);

  container.appendChild(description);

  return container;
};

export const setLiveRegionMessage = (message: string, seed: string): void => {
  const description: HTMLInputElement =
    document.body.querySelector(`[id="${seed}--${ARIA_DESCRIPTION_ID}"]`) ??
    null;
  if (description) {
    description.textContent = message;
  }
};

/**
 * Adds special parameters to form input to avoid password managers from trigger it's autocompletion on our field.
 * @param input
 */
export const suppressExtensionsAutocomplete = (
  input: HTMLInputElement
): void => {
  // 1Password password manager fix https://1password.community/discussion/comment/606453/#Comment_606453
  input.name = input.name + ' address-search';
  // LastPass password manager fix https://support.lastpass.com/help/how-do-i-prevent-fields-from-being-filled-automatically
  input.setAttribute('data-lpignore', 'true');
};

/**
 * Calculates the message for autofill component to be announced by VoiceOver utilities depending on its state.
 * @example
 * "Type in 2 or more characters for results." (When input text length is less than 2 characters)
 */
export const getAriaMessage = (
  searchValue: string,
  suggestions: (
    | SearchBoxSuggestion
    | AddressAutofillSuggestion
    | GeocodingFeature
  )[],
  selectedIndex: number | undefined
): string => {
  let ariaMessage = null;

  const noResults = !suggestions || suggestions.length === 0;

  if (searchValue?.length < 2) {
    ariaMessage = LENGTH_MESSAGE + ' ' + KEYBOARD_NAVIGATION_GUIDE_MESSAGE;
  } else if (noResults) {
    ariaMessage = NO_SEARCH_RESULTS_MESSAGE;
  } else if (selectedIndex !== undefined) {
    const suggestion = suggestions[selectedIndex];
    const placeName =
      (suggestion as SearchBoxSuggestion).name ||
      (suggestion as AddressAutofillSuggestion).feature_name ||
      (suggestion as GeocodingFeature).properties.name;

    ariaMessage = getSuggestionSelectedMessage(
      placeName,
      suggestions.length,
      selectedIndex + 1
    );
  } else {
    ariaMessage = getSuggestionsReadyMessage(suggestions.length);
  }

  return ariaMessage;
};
