import {
  MatchCodeConfidence,
  ValidationOptions,
  ValidationCore,
  AddressAutofillFeatureSuggestion
} from '@mapbox/search-js-core';
import noScroll from 'no-scroll';
import { createFocusTrap, FocusTrap } from 'focus-trap';

import { HTMLScopedElement } from './HTMLScopedElement';
import { MapboxAddressConfirmationFeature } from './MapboxAddressConfirmationFeature';
import { MapboxAddressConfirmationNoFeature } from './MapboxAddressConfirmationNoFeature';

import { bindElements, createElementFromString } from '../utils/dom';
import { AutofillValueMap, getAutofillSearchText } from '../utils/autofill';
import { AddressConfirmShowResult } from '../utils/confirmation';

import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { getThemeCSS, Theme } from '../theme';

import style from '../style.css';
import { config } from '../config';
import { MapboxAddressMinimap } from './MapboxAddressMinimap';

/**
 * Styling and theming options for a {@link MapboxAddressMinimap} embedded inside a confirmation dialog.
 *
 * @typedef ConfirmationMinimapOptions
 * @example
 * ```typescript
 * const result = await confirmAddress(form, {
 *   accessToken: 'abc-123',
 *   minimap: {
 *     defaultMapStyle: ['mapbox', 'outdoors-v11'],
 *     theme: { icons: { marker: MARKER_SVG } },
 *     mapStyleMode: 'default',
 *     satelliteToggle: true
 *   }
 * });
 * ```
 */
export type ConfirmationMinimapOptions = Partial<
  Pick<
    MapboxAddressMinimap,
    'defaultMapStyle' | 'theme' | 'mapStyleMode' | 'satelliteToggle'
  >
>;

/**
 * Object defining options for Address Autofill API, UI, form parsing, and address comparison
 * @typedef AddressConfirmOptions
 */
export interface AddressConfirmOptions {
  /**
   * Mapbox access token used for the Address Autofill and Static Image APIs
   */
  accessToken?: string;
  /**
   * CSS variables and icons
   */
  theme?: Theme;
  /**
   * Address Autofill API configuration options
   * {@link ValidationOptions}
   */
  options?: Partial<ValidationOptions>;
  /**
   * If true, a static minimap showing the suggested address location will be displayed in the modal dialog.
   * If an object, a minimap will be displayed with the specified styling and theming configuration.
   * Defaults to false.
   */
  minimap?: boolean | ConfirmationMinimapOptions;
  /**
   * An array of section names used within form element `autocomplete` attributes to identify and group one address section from another, e.g. "section-shipping" or "section-billing".
   * These are often used when a single <form> contains multiple logical sections.
   * If left undefined, all discoverable sections will be processed.
   */
  sections?: string[];
  /**
   * A callback used to pre-confirm an address and skip the UI modal.
   * The feature argument contains all address components, as well as an {@link MatchCode} object,
   * which are used to express the confidence of an address match.
   * The callback must return a boolean, with `true` indicating that the address has been pre-confirmed,
   * and the UI modal will be skipped and will not be presented to the end-user.
   * If left undefined, this defaults to skipping showing the modal when the validated feature's match code
   * returns an "exact" match.
   */
  skipConfirmModal?: (feature: AddressAutofillFeatureSuggestion) => boolean;
  /**
   * Custom footer text appearing at the bottom of the confirmation modal dialog.
   * If `true` or left undefined, the default footer text will be used.
   * If `false`, the footer will not be shown.
   */
  footer?: boolean | string;
}

const TEMPLATE = createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MapboxAddressConfirmation" aria-hidden="true">
    <mapbox-address-confirmation-feature class="ContentFeature"></mapbox-address-confirmation-feature>
    <mapbox-address-confirmation-no-feature class="ContentNoFeature"></mapbox-address-confirmation-no-feature>
  </div>
</template>
`);

type Binding = {
  MapboxAddressConfirmation: HTMLDivElement;
  ContentFeature: MapboxAddressConfirmationFeature;
  ContentNoFeature: MapboxAddressConfirmationNoFeature;
};

export type AddressConfirmationEventTypes = {
  result: MapboxHTMLEvent<AddressConfirmShowResult['type']>;
};

/**
 * {@link MapboxAddressConfirmation} is a custom element that
 * will display the "Did you mean..." message when the user
 * enters an address that doesn't match any of the results
 * returned by the Mapbox Address Autofill API.
 *
 * This element is used by {@link MapboxAddressAutofill} and the {@link autofill}
 * method, and should not be exposed to the user.
 */
export class MapboxAddressConfirmation extends HTMLScopedElement<AddressConfirmationEventTypes> {
  #show = false;

  #binding: Binding;
  #focusTrap: FocusTrap | null;

  get template(): HTMLTemplateElement {
    return TEMPLATE;
  }

  get templateStyle(): string {
    return style;
  }

  get templateUserStyle(): string {
    return getThemeCSS('.MapboxAddressConfirmation', this.theme);
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

    this.updateTemplateUserStyle(
      getThemeCSS('.MapboxAddressConfirmation', theme)
    );

    // Pass theme down into content elements
    const { ContentFeature, ContentNoFeature } = this.#binding;
    ContentFeature.theme = theme;
    ContentNoFeature.theme = theme;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.#binding = bindElements<Binding>(this, {
      MapboxAddressConfirmation: '.MapboxAddressConfirmation',
      ContentFeature: '.ContentFeature',
      ContentNoFeature: '.ContentNoFeature'
    });

    const { MapboxAddressConfirmation } = this.#binding;
    MapboxAddressConfirmation.setAttribute('aria-hidden', 'true');

    const theme = this.theme;
    if (theme) {
      const { ContentFeature, ContentNoFeature } = this.#binding;
      ContentFeature.theme = theme;
      ContentNoFeature.theme = theme;
    }
  }

  disconnectedCallback(): void {
    this.#focusTrap = null;
  }

  hide(): void {
    this.#show = false;

    if (!this.#binding) {
      return;
    }

    const { MapboxAddressConfirmation } = this.#binding;
    // Update accessibility flags.
    MapboxAddressConfirmation.setAttribute('aria-hidden', 'true');

    this.#focusTrap?.deactivate();
    noScroll.off();
  }

  async show(
    autofillValues: AutofillValueMap,
    optionsArg: AddressConfirmOptions,
    feature?: AddressAutofillFeatureSuggestion
  ): Promise<AddressConfirmShowResult> {
    if (!this.#binding) {
      return { type: 'cancel' };
    }

    const { MapboxAddressConfirmation, ContentFeature, ContentNoFeature } =
      this.#binding;

    const { accessToken, minimap = false, theme, footer } = optionsArg;

    // Update theme in this and child custom elements
    this.theme = theme;

    // Set content and visibility depending on feature definition
    if (feature) {
      ContentFeature.removeAttribute('aria-hidden');
      ContentNoFeature.setAttribute('aria-hidden', 'true');

      ContentFeature.minimap = minimap;
      ContentFeature.accessToken = accessToken;
      ContentFeature.footer = footer;

      ContentFeature.update(feature, autofillValues);
    } else {
      ContentFeature.setAttribute('aria-hidden', 'true');
      ContentNoFeature.removeAttribute('aria-hidden');

      ContentNoFeature.update(autofillValues);
    }

    this.#show = true;

    // Update accessibility flags.
    MapboxAddressConfirmation.removeAttribute('aria-hidden');

    noScroll.on();

    const activeContentElement = feature ? ContentFeature : ContentNoFeature;

    this.#focusTrap = createFocusTrap(MapboxAddressConfirmation, {
      fallbackFocus: activeContentElement,
      escapeDeactivates: (): boolean => {
        this.hide();
        return true;
      }
    });

    this.#focusTrap?.activate();

    // Wait for next result event, hide and then return.
    return new Promise((resolve) => {
      const eventHost = activeContentElement;
      const fn = (
        e: MapboxHTMLEvent<AddressConfirmShowResult['type']>
      ): void => {
        eventHost.removeEventListener('result', fn);

        const result = e.detail;
        this.hide();

        if (result === 'change') {
          resolve({
            type: 'change',
            feature
          });
        } else {
          resolve({
            type: result
          });
        }
      };

      eventHost.addEventListener('result', fn);
    });
  }

  /**
   * Attempts to show an address confirmation dialog by comparing form input values with the closest match via the Address Autofill API.
   * @param autofillValues - Map of form `<input>` values for each address component
   * @param optionsArg - Options object defining API options, UI controls, and callback defining when to bypass the dialog
   * @returns A promise indicating the action taken from the confirmation dialog
   */
  async tryShow(
    autofillValues: AutofillValueMap,
    optionsArg: AddressConfirmOptions
  ): Promise<AddressConfirmShowResult> {
    if (!this.#binding) {
      return { type: 'cancel' };
    }

    const { accessToken, options = {} } = optionsArg;

    const validate = new ValidationCore({
      accessToken: accessToken,
      ...options
    });

    // Get the form's new autofill values to compare against.
    const searchText = getAutofillSearchText(autofillValues);

    const featureCollection = await validate.validate(searchText, {
      sessionToken: config.autofillSessionToken
    });

    const feature = featureCollection.features[0];

    // Pre-validate feature from optional callback, or default to checking for exact match on match_code.
    // If pre-validated, return "nochange" early
    if (feature) {
      const defaultValidation = (feature: AddressAutofillFeatureSuggestion) =>
        feature.properties.match_code.confidence === MatchCodeConfidence.exact;
      const { skipConfirmModal = defaultValidation } = optionsArg;
      if (skipConfirmModal(feature)) {
        return { type: 'nochange' };
      }
    }

    return await this.show(autofillValues, optionsArg, feature);
  }
}

declare global {
  interface Window {
    MapboxAddressConfirmation: typeof MapboxAddressConfirmation;
  }
}

window.MapboxAddressConfirmation = MapboxAddressConfirmation;

if (!window.customElements.get('mapbox-address-confirmation')) {
  customElements.define(
    'mapbox-address-confirmation',
    MapboxAddressConfirmation
  );
}
