import { AddressAutofillFeatureSuggestion } from '@mapbox/search-js-core';
import { AddressConfirmOptions } from '../components/MapboxAddressConfirmation';
import { confirmAddress } from '../confirmAddress';
import {
  AutofillValueMap,
  findAddressAutofillInputs,
  findParentForm,
  parseFormStructure
} from './autofill';
import { createElementFromString } from './dom';

/**
 * Object indicating the decision made by the user during address confirmation when using {@link confirmAddress}.
 * @typedef AddressConfirmShowResult
 */
export type AddressConfirmShowResult =
  | { type: 'change'; feature: AddressAutofillFeatureSuggestion }
  | { type: 'nochange' }
  | { type: 'cancel' };

/**
 * Creates a formatted, multi-line HTML element representing an address
 * @param autofillValues - A map of address `<input>` values by autocomplete attribute
 * @param baseAddress - A full address string. If provided, this will be used for the
 * first and last lines of the formatted address, and will be supplemented by any `address-line2`
 * and/or `address-line3` values provided through the `autofillValues` map.
 * @param featureName - The name of the feature used as the first line of the address.
 * @param featureDescription - The context string the feature used as the last line of the address.
 * @param isSecondary - If true, the address is a secondary address and the featureName includes secondary info.
 * @returns
 */
export function createAddressElement(
  autofillValues: AutofillValueMap,
  baseAddress?: string,
  featureName?: string,
  featureDescription?: string,
  isSecondary?: boolean
): HTMLElement {
  if (baseAddress) {
    const element = createElementFromString<HTMLSpanElement>(`
        <span>
          <span></span>
          <br />
          <span></span>
        </span>
      `);

    const [firstLine, lastLine] = Array.from(
      element.querySelectorAll<HTMLSpanElement>('span > span')
    );

    if (featureName && featureDescription) {
      firstLine.textContent = featureName;
      lastLine.textContent = featureDescription;
    } else {
      const parts = baseAddress.split(',');
      firstLine.textContent = parts[0].trim();
      lastLine.textContent = parts.slice(1).join(',').trim();
    }

    // If the validated feature is not already a secondary address,
    // check the customer-entered form inputs to possibly insert into the display name
    if (!isSecondary) {
      // Add any customer-entered address-line2, address-line3 input values
      if (autofillValues['address-line2']) {
        const span = document.createElement('span');
        span.textContent = autofillValues['address-line2'];
        element.insertBefore(span, lastLine);
        element.insertBefore(document.createElement('br'), lastLine);
      }
      if (autofillValues['address-line3']) {
        const span = document.createElement('span');
        span.textContent = autofillValues['address-line3'];
        element.insertBefore(span, lastLine);
        element.insertBefore(document.createElement('br'), lastLine);
      }
    }

    return element;
  } else {
    const firstLine =
      autofillValues['street-address'] || autofillValues['address-line1'] || '';
    const line2 = autofillValues['address-line2'];
    const line3 = autofillValues['address-line3'];
    const lastLine = [
      autofillValues['address-level4'] || '',
      autofillValues['address-level3'] || '',
      autofillValues['address-level2'] || '',
      `${autofillValues['address-level1'] || ''} ${
        autofillValues['postal-code'] || ''
      }`,
      autofillValues.country || autofillValues['country-name'] || ''
    ]
      .filter(Boolean)
      .join(', ');
    const addressLines = [firstLine, line2, line3, lastLine].filter(Boolean);
    const addressLinesHtml = addressLines
      .map((val) => `<span>${val}</span>`)
      .join('<br />');
    const element = createElementFromString<HTMLSpanElement>(`
        <span>${addressLinesHtml}</span>
      `);
    return element;
  }
}

/**
 * Checks a browser autofill event against an Address Autofill input and, given
 * custom options, determines and configures if/how to show invoke {@link confirmAddress}.
 *
 * @param input - The `<input>` element wrapped or targeted by Address Autofill.
 * @param event - The custom window event detected and triggered on a browser autofill event.
 * @param confirmOnBrowserAutofill - The value of the instance property set on the autofill instance.
 * @param accessToken - A Mapbox access token.
 * @returns
 */
export async function tryConfirmBrowserAutofill(
  input: HTMLInputElement,
  event: CustomEvent,
  confirmOnBrowserAutofill: boolean | AddressConfirmOptions,
  accessToken: string
): Promise<void> {
  // Early exit if confirmation is not enabled on browser autofill events
  if (!confirmOnBrowserAutofill) return;

  const parentForm = findParentForm(input);
  /**
   * Check that at least one of the browser autofilled input elements are
   * part of the address structure of the form. E.g. if only "name" and "email"
   * fields were autofilled, we don't need to confirm the address.
   */
  const formElements = Object.values(
    findAddressAutofillInputs(parentForm, input)
  );
  if (!event.detail.elements.some((el) => formElements.includes(el))) {
    return;
  }

  const structure = parseFormStructure(parentForm);
  const structureRef = structure.find((s) => s.input === input);
  const autofillInstanceSection = structureRef.section;

  // Get list of form sections that were browser autofilled
  const browserAutofilledSections = Array.from(
    new Set(
      structure
        .filter((s) => event.detail.elements.includes(s.input))
        .map((s) => s.section)
    )
  );

  /**
   * Skip confirming the autofill instance section if it's not included in
   * what was autofilled by the browser
   */
  if (!browserAutofilledSections.includes(autofillInstanceSection)) {
    return;
  }

  /**
   * Skip confirmation if the impacted autocomplete "section" is not included in
   * an explicitly defined array of form sections from a confirmOnBrowserAutofill object.
   * e.g. The browser autofill event was triggered by inputs with "section-billing" in
   * their `autocomplete` attribute value, but the `<input>` element targeted by this
   * autofill instance in this has "section-shipping".
   */
  const optionsSections =
    (typeof confirmOnBrowserAutofill === 'object' &&
      confirmOnBrowserAutofill.sections) ||
    [];
  if (
    optionsSections.length &&
    !optionsSections.some((section) =>
      browserAutofilledSections.includes(section)
    )
  ) {
    return;
  }

  /**
   * Modify optionsArg to restrict confirmation to only occur
   * on the "section" impacted by the browser autofill event.
   */
  let optionsArg: AddressConfirmOptions =
    typeof confirmOnBrowserAutofill === 'object'
      ? confirmOnBrowserAutofill
      : {};
  optionsArg = {
    ...optionsArg,
    accessToken,
    sections: [autofillInstanceSection]
  };
  await confirmAddress(parentForm, optionsArg);
}
