import {
  AddressAutofillSuggestion,
  GeocodingFeature,
  SearchBoxSuggestion
} from '@mapbox/search-js-core';
import { SEARCH_SERVICE } from './services';

/**
 * Returns the string from suggestions that meant to be used as first stroke
 * title in search results list for that particular suggestion.
 */
export const getSuggestionTitle = (
  item: SearchBoxSuggestion | AddressAutofillSuggestion | GeocodingFeature,
  service: SEARCH_SERVICE
): string => {
  switch (service) {
    case SEARCH_SERVICE.AddressAutofill:
      return (
        (item as AddressAutofillSuggestion).matching_name ||
        (item as AddressAutofillSuggestion).feature_name ||
        (item as AddressAutofillSuggestion).address_line1
      );
    case SEARCH_SERVICE.SearchBox:
      return (item as SearchBoxSuggestion).name;
    case SEARCH_SERVICE.Geocoding:
      return (item as GeocodingFeature).properties.name;
    default:
      return '';
  }
};

/**
 * Returns parsed/formatted description text to show in the second line of an autofill suggestion element
 */
export const buildSuggestionDescription = (
  item: SearchBoxSuggestion | AddressAutofillSuggestion | GeocodingFeature,
  service: SEARCH_SERVICE
): string => {
  switch (service) {
    case SEARCH_SERVICE.AddressAutofill:
      return (item as AddressAutofillSuggestion).description;
    case SEARCH_SERVICE.SearchBox:
      if ((item as SearchBoxSuggestion).feature_type === 'poi') {
        // TODO: update this to be street name + place_formatted, once API response is updated
        return (item as SearchBoxSuggestion).full_address;
      }
      return (item as SearchBoxSuggestion).place_formatted;
    case SEARCH_SERVICE.Geocoding:
      return (item as GeocodingFeature).properties.place_formatted;
    default:
      return '';
  }
};

/**
 * Event detail object for the 'input' event.
 */
export interface InputEventDetail {
  /**
   * The last character (or characters if pasted) that was inputted into the input field.
   */
  lastInput: string;
  /**
   * The current value of the input field.
   */
  inputText: string;
}
