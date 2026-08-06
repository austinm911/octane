export const LENGTH_MESSAGE = 'Type in 2 or more characters for results.';

export const KEYBOARD_NAVIGATION_GUIDE_MESSAGE =
  'When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.';

export const NO_SEARCH_RESULTS_MESSAGE = 'No search results.';

export const getSuggestionSelectedMessage = (
  address: string,
  numberOfResults: number,
  currentIndex: number
): string =>
  `${numberOfResults} ${
    numberOfResults === 1 ? 'result is' : 'results are'
  } available. ${address}. ${currentIndex} of ${numberOfResults} is selected.`;

export const getSuggestionsReadyMessage = (numberOfResults: number): string =>
  `${numberOfResults} ${
    numberOfResults === 1 ? 'result is' : 'results are'
  } available. Use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.`;
