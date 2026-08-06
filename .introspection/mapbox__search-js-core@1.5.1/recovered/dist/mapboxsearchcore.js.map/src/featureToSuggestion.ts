import {
  SearchBoxFeatureSuggestion,
  SearchBoxFeatureProperties
} from './searchbox/types';
import {
  AddressAutofillFeatureSuggestion,
  AddressAutofillSuggestion
} from './autofill/types';

function featureToSuggestion(
  feature: SearchBoxFeatureSuggestion
): SearchBoxFeatureProperties;

function featureToSuggestion(
  feature: AddressAutofillFeatureSuggestion
): AddressAutofillSuggestion;

/**
 * Utility function to convert the {@link SearchBoxFeatureSuggestion} properties to a
 * {@link SearchBoxFeatureProperties} object.
 */
function featureToSuggestion(
  feature: SearchBoxFeatureSuggestion | AddressAutofillFeatureSuggestion
):
  | SearchBoxFeatureProperties
  | Omit<AddressAutofillSuggestion, 'original_search_text' | 'action'> {
  const { properties } = feature;
  return {
    ...properties
  };
}

export { featureToSuggestion };
