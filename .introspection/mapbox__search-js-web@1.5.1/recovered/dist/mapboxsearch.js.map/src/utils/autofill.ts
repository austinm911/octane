import {
  AddressAutofillFeatureSuggestion,
  AddressAutofillSuggestion,
  featureToSuggestion
} from '@mapbox/search-js-core';
import { InputFormElement, isVisible, setValue } from './dom';
import { SEARCH_SERVICE } from './services';
import { getSuggestionTitle } from './listbox';

/**
 * A list of WHATWG autofill tokens relevant to addresses. These will be used to
 * set the `autocomplete` attribute on the input element.
 *
 * Reference: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute
 */
type AutofillTokens =
  | 'street-address'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'address-level4'
  | 'address-level3'
  | 'address-level2'
  | 'address-level1'
  | 'country'
  | 'country-name'
  | 'postal-code';

export const AUTOFILL_TOKENS = new Set<AutofillTokens>([
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code'
]);

/**
 * A list of WHATWG autofill tokens we can safely ignore when traversing
 * `autocomplete` attributes.
 */
const AUTOFILL_SKIP_TOKENS = new Set(['off', 'on', 'true', 'false']);

/**
 * Finds the parent form element of the given element, if any.
 *
 * @returns The parent form element, or `null` if none was found.
 */
export function findParentForm(el: Element): HTMLFormElement | null {
  let node = el.parentNode;
  while (node) {
    if (node instanceof HTMLFormElement) {
      return node;
    }
    node = node.parentNode;
  }

  return null;
}

/**
 * Finds input elements that are eligible to be used for Address Autofill.
 * Eligible inputs include those with standard WHATWG autocomplete attribute values, either 'address-line1' or 'street-address'
 * @param form - If specified, searches within the given form instead of the whole document
 * @returns Array of input elements
 */
export function findAddressInputs(form?: HTMLFormElement): HTMLInputElement[] {
  const parent = form || document;
  return Array.from(
    parent.querySelectorAll<HTMLInputElement>(
      'input[autocomplete~="address-line1"], input[autocomplete~="street-address"]'
    )
  );
}

const SECTION = 'section-';

const SECTION_DEFAULT = 'section-default';
const SECTION_SHIPPING = 'section-shipping';
const SECTION_BILLING = 'section-billing';

type FormStructure = {
  input: InputFormElement;
  section: string;
  field: AutofillTokens;
}[];

/**
 * Implementation of "autocomplete" {@link FormStructure} that matches the
 * WHATWG spec and somewhat Chromium.
 *
 * `billing` and `shipping` are treated as special sections. The {@link SECTION_SHIPPING}
 * and {@link SECTION_BILLING} symbols are used to identify them.
 *
 * Any inputs without an `autocomplete` attribute are skipped.
 *
 * Reference: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
 * Reference: https://github.com/chromium/chromium/blob/18a1302acbf920bc692ec6bd986cacd41ae9c25c/components/autofill/core/browser/form_structure.cc#L1503
 */
export function parseFormStructure(form: HTMLFormElement): FormStructure {
  const inputs = Array.from(
    form.querySelectorAll<InputFormElement>('[autocomplete]')
  ).filter((el) => {
    const tagName = el.tagName.toLowerCase();
    return (
      tagName === 'input' || tagName === 'select' || tagName === 'textarea'
    );
  });

  const res: FormStructure = [];

  for (const input of inputs) {
    if (!isVisible(input)) {
      continue;
    }

    // Note: HTML <input> element has an HTMLInputElement.autocomplete reflection
    // property, but <select> elements do not.
    //
    // This does **not** mean that autocomplete properties are not valid on
    // selects. I verified this on a popular e-commerce checkout page.
    const autocomplete = input.getAttribute('autocomplete') || '';
    if (!autocomplete || AUTOFILL_SKIP_TOKENS.has(autocomplete)) {
      continue;
    }

    const tokens = autocomplete.toLowerCase().split(' ');

    // The tokens are parsed in reverse order. The expected pattern is:
    // [section-*] [shipping|billing] [type_hint] field_type

    // Address tokens can be a maximum length of 3. We don't need to check [type_hint].
    if (tokens.length > 3) {
      continue;
    }

    // The last token should be a part of our scheme.
    const field = tokens[tokens.length - 1] as AutofillTokens;
    if (!AUTOFILL_TOKENS.has(field)) {
      continue;
    }
    tokens.pop();

    let section: symbol | string = SECTION_DEFAULT;

    // The second to last token /could/ be 'shipping' or 'billing'.
    if (tokens.length) {
      const sectionToken = tokens[tokens.length - 1];

      if (sectionToken === 'shipping') {
        section = SECTION_SHIPPING;
        tokens.pop();
      }

      if (sectionToken === 'billing') {
        section = SECTION_BILLING;
        tokens.pop();
      }
    }

    // The remaining tokens could be a section.
    if (tokens.length) {
      const sectionToken = tokens[tokens.length - 1];
      if (sectionToken.startsWith(SECTION)) {
        section = sectionToken;
      }
    }

    res.push({
      input,
      section,
      field
    });
  }

  return res;
}

export type AutofillInputMap = { [key in AutofillTokens]?: InputFormElement };
/**
 * Object mapping WHATWG autocomplete attribute values to corresponding address component strings.
 *
 * @typedef AutofillValueMap
 * @example
 * ```typescript
 * {
 *   "street-address"?: string;
 *   "address-line1"?: string;
 *   "address-line2"?: string;
 *   "address-line3"?: string;
 *   "address-level4"?: string;
 *   "address-level3"?: string;
 *   "address-level2"?: string;
 *   "address-level1"?: string;
 *   country?: string;
 *   "country-name"?: string;
 *   "postal-code"?: string;
 * }
 * ```
 */
export type AutofillValueMap = { [key in AutofillTokens]?: string };

/**
 * Reference: [chromium.md](../../../../docs/search_js_web/chromium.md)
 *
 * Implementation of autofill that closely matches Chromium, with a few noted differences:
 *
 * 1. There is no hueristic for inferring a match, so the
 *    WHATWG "autocomplete" attribute is required.
 * 2. This parser, unlike Chromium, doesn't allow more than one token type per
 *    section. Chromium **only** allows this if they are in the same order.
 */
export function findAddressAutofillInputs(
  form: HTMLFormElement,
  ref: HTMLInputElement
): AutofillInputMap {
  // Use an array-of-structs to improve performance.
  // Reference: https://en.wikipedia.org/wiki/AoS_and_SoA#:~:text=Structure%20of%20arrays%20(SoA)%20is,one%20parallel%20array%20per%20field.
  const logicalSections: AutofillInputMap[] = [];
  const logicalSectionSections: (string | symbol)[] = [];

  // Parse the form structure, then go through each node to create
  // logical sections.
  const formStructure = parseFormStructure(form);

  // When we traverse through the form structure, we can check the input against
  // ref to find the logical section we actually want.
  let foundSection: AutofillInputMap = null;

  for (const { input, section, field } of formStructure) {
    let lastIndex = logicalSections.length - 1;

    // 1. If we have no logical sections, create a new section.
    // 2. If the current section is different from the last section, create a new section.
    // 3. If the current field already exists in the last section, create a new section.
    let createNewSection = false;
    if (!logicalSections.length) {
      createNewSection = true;
    } else if (logicalSectionSections[lastIndex] !== section) {
      createNewSection = true;
    } else if (logicalSections[lastIndex][field]) {
      createNewSection = true;
    }

    if (createNewSection) {
      // If we have already found a logical section, creating new sections
      // just wastes time.
      if (foundSection) {
        break;
      }

      logicalSections.push({
        [field]: input
      });

      logicalSectionSections.push(section);
      // Make sure to update lastIndex.
      lastIndex++;
    } else {
      logicalSections[lastIndex][field] = input;
    }

    if (input === ref) {
      foundSection = logicalSections[lastIndex];
    }
  }

  return foundSection ?? {};
}

/**
 * Fills in the address form using HTML autocomplete attributes.
 *
 * This does a mapping from {@link SearchBoxAdministrativeUnitTypes} to corresponding WHATWG autocomplete types.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values
 * https://docs.mapbox.com/api/search/search-box/#administrative-unit-types
 */
export function setFormAutofillValues(
  form: HTMLFormElement,
  ref: HTMLInputElement,
  suggestion: AddressAutofillSuggestion
): void {
  // Find the inputs that we should fill in.
  const map = findAddressAutofillInputs(form, ref);

  const streetAddress = [
    suggestion.address_line1,
    suggestion.address_line2,
    suggestion.address_line3
  ]
    .filter((part) => Boolean(part))
    .join(', ');

  setValue(
    map['street-address'],
    map['address-line2'] ? suggestion.address_line1 || '' : streetAddress
  );
  setValue(map['address-line1'], suggestion.address_line1 || '');
  setValue(map['address-line2'], suggestion.address_line2 || '');

  setValue(map['address-level1'], suggestion.address_level1 || '');
  setValue(map['address-level2'], suggestion.address_level2 || '');
  setValue(map['address-level3'], suggestion.address_level3 || '');

  // Country in WHATWG refers to the country code, not the name.
  // Example: 'jp' instead of 'Japan'.

  // Note: Make sure to match case here. The country code is lower-case.
  const countryCode =
    suggestion.country_code || suggestion.metadata?.iso_3166_1 || '';
  if (map.country && map.country instanceof HTMLSelectElement) {
    let firstOption = map.country.querySelector(`option`).value;
    if (firstOption === '') {
      // First option was an empty string placeholder, use the second option
      firstOption = map.country.querySelectorAll(`option`)[1].value;
    }
    const isUpperCase = firstOption === firstOption.toUpperCase();

    setValue(
      map['country'],
      isUpperCase ? countryCode.toUpperCase() : countryCode
    );
  } else {
    setValue(map['country'], countryCode);
  }

  setValue(map['country-name'], suggestion.country || '');
  setValue(map['postal-code'], suggestion.postcode || '');
}

/**
 * Gets the current input values for address fields given a form and a reference input.
 *
 * @param form - HTML form that includes the autocomplete-compliant input fields
 * @param ref - An input element within the desired form address section
 * @returns A object mapping WHATWG autocomplete properties to their respective form field values
 *
 * @example
 * ```typescript
 * const form = document.querySelector(form);
 * const input = form.querySelector('input[autocomplete~="street-address"]')
 * const valueMap = getFormAutofillValues(form, input);
 * console.log(valueMap);
 * // {
 * //   "street-address": "123 Main",
 * //   "address-level2": "Boston",
 * //   "address-level1": "MA",
 * //   "postal-code": "02129"
 * // }
 * ```
 */
export function getFormAutofillValues(
  form: HTMLFormElement,
  ref: HTMLInputElement
): AutofillValueMap {
  const map = findAddressAutofillInputs(form, ref);
  const values: AutofillValueMap = {};
  for (const [key, input] of Object.entries(map)) {
    if (input?.value) {
      values[key] = input.value;
    }
  }

  return values;
}

/**
 * Converts an {@link AutofillValueMap} to a single line, suitable for
 * display in a text field.
 *
 * @param snapshot - An object mapping WHATWG autocomplete attribute values to their corresponding input field values
 * @returns A concatenated address string
 *
 * @example
 * ```typescript
 * const values = {
 *   'street-address': '123 Main St',
 *   'address-level1': 'CA',
 *   'address-level2': 'San Francisco',
 *   'address-level3': '',
 * };
 *
 * const searchText = getAutofillSearchText(values);
 * console.log(searchText); // '123 Main St, San Francisco, CA'
 * ```
 */
export function getAutofillSearchText(snapshot: AutofillValueMap): string {
  const searchText = [];

  if (snapshot['street-address']) {
    searchText.push(snapshot['street-address']);
  } else {
    searchText.push(snapshot['address-line1'] || '');
  }

  searchText.push(snapshot['address-line2'] || '');
  searchText.push(snapshot['address-line3'] || '');

  searchText.push(snapshot['address-level3'] || '');
  searchText.push(snapshot['address-level2'] || '');
  searchText.push(snapshot['address-level1'] || '');
  searchText.push(snapshot['postal-code'] || '');

  if (snapshot['country-name']) {
    searchText.push(snapshot['country-name']);
  } else {
    searchText.push(snapshot['country'] || '');
  }

  return searchText
    .filter((part) => Boolean(part))
    .map((part) => part.trim())
    .join(', ');
}

export function fillFormWithFeature(
  feature: AddressAutofillFeatureSuggestion,
  input: HTMLInputElement
): void {
  const form = findParentForm(input);
  if (!form) {
    return;
  }

  const suggestion = featureToSuggestion(feature);
  setFormAutofillValues(form, input, suggestion);

  const inputMap = findAddressAutofillInputs(form, input);
  // TODO: check if suggestion has "missing_unit" property true
  if (inputMap['address-line2'] && !suggestion.address_line2) {
    inputMap['address-line2'].focus();
  }
}

/**
 * Gets address property values from an Autofill feature.
 *
 * @param feature - A {@link AddressAutofillFeatureSuggestion} object.
 * @returns A object mapping WHATWG autocomplete properties to their respective feature values
 */
export function featureToAutofillValueMap(
  feature: AddressAutofillFeatureSuggestion
): AutofillValueMap {
  const values: AutofillValueMap = {};

  const streetAddress = [
    feature.properties.address_line1,
    feature.properties.address_line2,
    feature.properties.address_line3
  ]
    .filter((part) => Boolean(part))
    .join(', ');

  values['street-address'] = streetAddress;
  values['address-line1'] = feature.properties.address_line1;
  values['address-line2'] = feature.properties.address_line2;
  values['address-line3'] = feature.properties.address_line3;
  values['address-level1'] = feature.properties.address_level1;
  values['address-level2'] = feature.properties.address_level2;
  values['address-level3'] = feature.properties.address_level3;
  values['country'] = feature.properties.metadata?.iso_3166_1;
  values['country-name'] = feature.properties.country;
  values['postal-code'] = feature.properties.postcode;

  return values;
}

/**
 * Checks if WHATWG address values from one object match those from another.
 *
 * Can be used to compare an HTML form state against the most recently retrieved Autofill feature
 * to determine if a form has been manually edited after a previous Autofill event.
 *
 * @param targetMap - An {@link AutofillValueMap} object.
 * @param referenceMap - An {@link AutofillValueMap} object.
 * @returns False if all values from the target map are equal to their corresponding value from the reference map.
 */
export function checkAutofillValuesChanged(
  targetMap: AutofillValueMap,
  referenceMap: AutofillValueMap
): boolean {
  for (const [key, value] of Object.entries(targetMap)) {
    if (referenceMap[key] !== value) return true;
  }
  return false;
}

/**
 * Takes the suggestions array and filters streets inside it to leave only unique ones
 */
export const distinctExactStreetResults = (
  suggestions: AddressAutofillSuggestion[]
): AddressAutofillSuggestion[] => {
  return suggestions.filter((item1, idx, arr) => {
    const title = getSuggestionTitle(item1, SEARCH_SERVICE.AddressAutofill);
    return (
      item1.accuracy !== 'street' ||
      arr.findIndex(
        (item2) =>
          title === getSuggestionTitle(item2, SEARCH_SERVICE.AddressAutofill)
      ) === idx
    );
  });
};

export const toggleAutocompletion = (
  input: HTMLInputElement,
  initialAutocompleteValue: string,
  enableBrowserAutocomplete: boolean
): void => {
  /**
   * 'new-password' prevents some browsers from suggestion autocompetion including saved addresses, passwords and etc.
   * https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion#preventing_autofilling_with_autocompletenew-password
   */
  const disableValue = 'new-password';
  const defaultFallbackValue = 'address-line1';

  const autocompleteValue = enableBrowserAutocomplete
    ? initialAutocompleteValue || defaultFallbackValue
    : disableValue;

  if (input) {
    input.autocomplete = autocompleteValue;
  }
};

export const handleStreetSelection = (
  input: HTMLInputElement,
  initialAutocompleteValue: string,
  suggestion: AddressAutofillSuggestion
): void => {
  if (!input || !suggestion) {
    return;
  }

  // autocomplete attribute is required by fillFormWithFeature method.
  toggleAutocompletion(input, initialAutocompleteValue, true);

  const feature: AddressAutofillFeatureSuggestion = {
    properties: {
      ...suggestion,
      address_line1: suggestion.address_line1 + ' ',
      postcode: null
    }
  } as any;

  fillFormWithFeature(feature, input);

  // turn off browser autocomplete back
  toggleAutocompletion(input, initialAutocompleteValue, false);

  input?.focus();
};
