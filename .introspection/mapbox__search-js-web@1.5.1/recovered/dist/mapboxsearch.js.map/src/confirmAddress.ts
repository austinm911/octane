import {
  AddressAutofillFeatureSuggestion,
  featureToSuggestion
} from '@mapbox/search-js-core';
import { MapboxSearchListboxAutofillType } from './components/MapboxAddressAutofill';
import {
  AddressConfirmOptions,
  MapboxAddressConfirmation
} from './components/MapboxAddressConfirmation';
import { config } from './config';

import {
  featureToAutofillValueMap,
  findAddressInputs,
  getFormAutofillValues,
  checkAutofillValuesChanged,
  parseFormStructure,
  setFormAutofillValues,
  findAddressAutofillInputs
} from './utils/autofill';
import { AddressConfirmShowResult } from './utils/confirmation';

const confirmation = new MapboxAddressConfirmation();

/**
 * A utility that can be run prior to form submission that allows a user to correct or confirm an address.
 *
 * This parses and compares an address entered into form fields with the closest address suggestion from the Mapbox Address Autofill API.
 * Unless an exact match or a custom comparison callback evaluates to true, the user will be shown a modal dialog
 * asking if they would like to use the suggested address.
 *
 * When a suggested address is accepted, the values are automatically updated in the form fields.
 * @param form - HTML form that includes the autocomplete-compliant input fields
 * @param optionsArg - {@link AddressConfirmOptions} Object defining options for Address Autofill API, UI, form parsing, and address comparison
 * @returns A promise resolving with a result object indicating the decision made by the user
 * @example
 * ```typescript
 * form.addEventListener("submit", async (e) => {
 *   e.preventDefault();
 *   const result = await confirmAddress(form, {
 *     minimap: true,
 *     skipConfirmModal: (feature) =>
 *       ['exact', 'high'].includes(
 *         feature.properties.match_code.confidence
 *       )
 *   });
 *   if (result.type === 'nochange') submitForm();
 * });
 * ```
 */
export async function confirmAddress(
  form: HTMLFormElement,
  optionsArg: AddressConfirmOptions = {}
): Promise<AddressConfirmShowResult> {
  const { sections = [] } = optionsArg;

  if (!confirmation.parentNode) {
    document.body.appendChild(confirmation);
  }

  let collectedResult: AddressConfirmShowResult = { type: 'nochange' };

  const inputs = findAddressInputs(form);
  const structure = parseFormStructure(form);

  const listboxComponents = Array.from(
    document.querySelectorAll<MapboxSearchListboxAutofillType>(
      'mapbox-search-listbox'
    )
  );

  for (const input of inputs) {
    // If we have sections, filter by the form structure.
    if (sections.length) {
      const structureRef = structure.find((s) => s.input === input);
      if (!structureRef) {
        continue;
      }

      if (!sections.includes(structureRef.section)) {
        continue;
      }
    }

    // Get the form's new autofill values to compare against.
    const autofillValues = getFormAutofillValues(form, input);

    // Compare form values against the latest Address Autofill snapshot (if any);
    // If form values have not changed since last snapshot, skip showing confirmation.
    const listbox = listboxComponents.find((lb) => lb.input === input);
    const autofill = listbox?.autofillHost;
    if (autofill) {
      const lastRetrievedFeature =
        autofill.retrieveFeature as AddressAutofillFeatureSuggestion;
      if (lastRetrievedFeature) {
        const snapshot = featureToAutofillValueMap(lastRetrievedFeature);
        if (!checkAutofillValuesChanged(autofillValues, snapshot)) {
          continue;
        }
      }
    }

    // Show the confirmation with the first feature.
    const accessToken = optionsArg.accessToken || config.accessToken;
    const result = await confirmation.tryShow(autofillValues, {
      ...optionsArg,
      accessToken
    });

    // If changed, autofill the form.
    if (result.type === 'change') {
      const inputMap = findAddressAutofillInputs(form, input);
      if (inputMap['address-line2']?.value) {
        // carry over address-line2 if it exists on the form
        result.feature.properties.address_line2 =
          inputMap['address-line2'].value;
      }
      if (listbox) {
        // Simulate the feature as if it were retrieved by Address Autofill
        autofill.simulateRetrieve(result.feature);
      } else {
        input.dataset['mapboxSuccess'] = 'true';
        const suggestion = featureToSuggestion(result.feature);
        setFormAutofillValues(form, input, suggestion);
      }
    }

    // Set to changed if changed and not cancelled.
    if (result.type === 'change' && collectedResult.type !== 'cancel') {
      collectedResult = result;
    }

    // Set to cancelled if cancelled.
    if (result.type === 'cancel') {
      collectedResult = result;
    }
  }

  return collectedResult;
}
