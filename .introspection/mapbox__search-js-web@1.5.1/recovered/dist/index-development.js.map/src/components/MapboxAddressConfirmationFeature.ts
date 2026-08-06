import { AddressAutofillFeatureSuggestion } from '@mapbox/search-js-core';

import { MapboxAddressMinimap } from './MapboxAddressMinimap';
import { HTMLScopedElement } from './HTMLScopedElement';
import {
  AddressConfirmationEventTypes,
  ConfirmationMinimapOptions
} from './MapboxAddressConfirmation';

import { randomValidID } from '../utils';
import { bindElements, createElementFromString } from '../utils/dom';
import { ariaButtonKeyDown } from '../utils/aria';
import { AutofillValueMap, getAutofillSearchText } from '../utils/autofill';
import {
  AddressConfirmShowResult,
  createAddressElement
} from '../utils/confirmation';
import { sendFeedback } from '../utils/contribute';

import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { getIcon, getThemeCSS, Theme } from '../theme';

import style from '../style.css';

const TEMPLATE = createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MapboxAddressConfirmationFeature">
    <div class="Modal" aria-modal="true" role="dialog">
      <div class="ModalHeader">
        <svg viewBox="0 0 18 18" class="Icon IconQuestion"></svg>
        <div class="ModalHeaderTitle">Did you mean?</div>
        <svg
          viewBox="0 0 18 18"
          class="Icon IconClose"
          tabindex="0"
          role="button"
          title="Close"
          aria-label="Close"
          aria-expanded="true"
        ></svg>
      </div>

      <div class="ModalAddress ModalAddressApprove"></div>
            
      <div class="ModalMap">
        <mapbox-address-minimap class="Minimap"></mapbox-address-minimap>
      </div>

      <div
        class="Button ButtonPrimary ButtonApprove"
        tabindex="0"
        role="button"
        aria-label="Yes"
      >
        Yes
      </div>
      
      <div
        class="Button ButtonSecondary ButtonReject"
        tabindex="0"
        role="button"
        aria-label="No, use the address I provided"
      >
        No, use the address I provided
      </div>

      <div class="ModalFooter">
          Your confirmation helps improve address data accuracy.
      </div>
    </div>
  </div>
</template>
`);

type Binding = {
  MapboxAddressConfirmationFeature: HTMLDivElement;
  Modal: HTMLDivElement;
  ModalHeaderTitle: HTMLDivElement;
  ModalMap: HTMLDivElement;
  Minimap: MapboxAddressMinimap;

  IconQuestion: SVGSVGElement;
  IconClose: SVGSVGElement;

  ButtonApprove: HTMLDivElement;
  ButtonReject: HTMLDivElement;

  ModalAddressApprove: HTMLDivElement;
};

/**
 * {@link MapboxAddressConfirmationNoFeature} is a custom element that
 * will display a notification showing the closest suggested address to what a user has provided in the form.
 * Optionally, it can display a {@link MapboxAddressMinimap} for the suggesested address feature.
 *
 * This element is hosted by {@link MapboxAddressConfirmation} and should not be exposed to the user.
 */
export class MapboxAddressConfirmationFeature extends HTMLScopedElement<AddressConfirmationEventTypes> {
  #binding: Binding;

  get template(): HTMLTemplateElement {
    return TEMPLATE;
  }

  get templateStyle(): string {
    return style;
  }

  get templateUserStyle(): string {
    return getThemeCSS('.MapboxAddressConfirmationFeature', this.theme);
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
      getThemeCSS('.MapboxAddressConfirmationFeature', theme)
    );

    const { IconQuestion, IconClose } = this.#binding;

    IconQuestion.innerHTML = getIcon('question', theme);
    IconClose.innerHTML = getIcon('close', theme);
  }

  set footer(val: boolean | string) {
    // Update modal footer, if specified
    if (val === undefined) return;
    const footerEl = this.querySelector('.ModalFooter');
    if (typeof val === 'string') {
      footerEl.textContent = val;
      footerEl.removeAttribute('aria-hidden');
    } else if (!val) {
      footerEl.setAttribute('aria-hidden', 'true');
    } else {
      footerEl.removeAttribute('aria-hidden');
    }
  }

  minimap: boolean | ConfirmationMinimapOptions = false;
  accessToken: string;

  #feature: AddressAutofillFeatureSuggestion;
  #formValues: AutofillValueMap;

  /**
   * Update modal content with a given address suggestion
   * @param feature - Suggested feature
   * @param autofillValues - User-provided input values from address fields; used to backfill address-line2, address-line3
   */
  update = (
    feature: AddressAutofillFeatureSuggestion,
    autofillValues: AutofillValueMap
  ): void => {
    this.#feature = feature;
    this.#formValues = autofillValues;
    const { ModalMap, Minimap, ModalAddressApprove } = this.#binding;
    // Update minimap if enabled
    if (this.minimap) {
      ModalMap.removeAttribute('aria-hidden');
      Minimap.accessToken = this.accessToken;
      if (typeof this.minimap === 'object') {
        const { defaultMapStyle, theme, mapStyleMode, satelliteToggle } =
          this.minimap;
        defaultMapStyle &&
          (Minimap.defaultMapStyle = this.minimap.defaultMapStyle);
        theme && (Minimap.theme = this.minimap.theme);
        mapStyleMode && (Minimap.mapStyleMode = mapStyleMode);
        satelliteToggle !== undefined &&
          (Minimap.satelliteToggle = satelliteToggle);
      }
      Minimap.feature = feature;
    } else {
      ModalMap.setAttribute('aria-hidden', 'true');
    }

    const approveAddress =
      feature.properties.place_name ||
      feature.properties.full_address ||
      feature.properties.address;

    // Set the text of the approve address.
    ModalAddressApprove.innerHTML = '';
    ModalAddressApprove.appendChild(
      createAddressElement(
        autofillValues,
        approveAddress,
        feature.properties.feature_name,
        feature.properties.description,
        feature.properties.place_type?.[0] === 'secondary_address'
      )
    );
  };

  #handleClose = (): void => {
    this.dispatchEvent(
      new MapboxHTMLEvent<AddressConfirmShowResult['type']>('result', 'cancel')
    );
  };

  approve = (): void => {
    this.dispatchEvent(
      new MapboxHTMLEvent<AddressConfirmShowResult['type']>('result', 'change')
    );
  };

  reject = (): void => {
    this.dispatchEvent(
      new MapboxHTMLEvent<AddressConfirmShowResult['type']>(
        'result',
        'nochange'
      )
    );
    // Send feedback to Contribute API with the address from the user's preferred form values
    sendFeedback(this.accessToken, {
      originalCoordinate: this.#feature.geometry.coordinates as [
        number,
        number
      ],
      originalAddress: this.#feature.properties.full_address,
      changes: {
        address: getAutofillSearchText(this.#formValues)
      },
      labels: ['address_confirm_form']
    });
  };

  // IDs to connect for ARIA.
  #modalID = randomValidID();
  #modalHeaderTitleID = randomValidID();
  #modalAddressApproveID = randomValidID();

  connectedCallback(): void {
    super.connectedCallback();

    this.#binding = bindElements<Binding>(this, {
      MapboxAddressConfirmationFeature: '.MapboxAddressConfirmationFeature',
      Modal: '.Modal',
      ModalHeaderTitle: '.ModalHeaderTitle',
      ModalMap: '.ModalMap',
      Minimap: '.Minimap',

      IconQuestion: '.IconQuestion',
      IconClose: '.IconClose',

      ButtonApprove: '.ButtonApprove',
      ButtonReject: '.ButtonReject',

      ModalAddressApprove: '.ModalAddressApprove'
    });

    const {
      Modal,
      ModalHeaderTitle,
      IconClose,
      ButtonApprove,
      ButtonReject,
      ModalAddressApprove
    } = this.#binding;

    // Setup IDREFs for WAI-ARIA.
    Modal.setAttribute('aria-labelledby', this.#modalHeaderTitleID);
    Modal.setAttribute('aria-describedby', this.#modalAddressApproveID);
    IconClose.setAttribute('aria-controls', this.#modalID);

    Modal.id = this.#modalID;
    ModalHeaderTitle.id = this.#modalHeaderTitleID;
    ModalAddressApprove.id = this.#modalAddressApproveID;

    // Setup WAI-ARIA button keyboard events.
    const buttons = Array.from(this.querySelectorAll('[role="button"]'));
    for (const button of buttons) {
      button.addEventListener('keydown', ariaButtonKeyDown);
    }

    // Setup event listeners.
    IconClose.addEventListener('click', this.#handleClose);
    ButtonApprove.addEventListener('click', this.approve);
    ButtonReject.addEventListener('click', this.reject);

    const theme = this.theme;
    if (theme) {
      const { IconQuestion, IconClose } = this.#binding;

      IconQuestion.innerHTML = getIcon('question', theme);
      IconClose.innerHTML = getIcon('close', theme);
    }
  }

  disconnectedCallback(): void {
    const { IconClose, ButtonApprove } = this.#binding;

    // Make sure to unbind event listeners.
    IconClose.removeEventListener('click', this.#handleClose);
    ButtonApprove.removeEventListener('click', this.approve);
  }
}

declare global {
  interface Window {
    MapboxAddressConfirmationFeature: typeof MapboxAddressConfirmationFeature;
  }
}

window.MapboxAddressConfirmationFeature = MapboxAddressConfirmationFeature;

if (!window.customElements.get('mapbox-address-confirmation-feature')) {
  customElements.define(
    'mapbox-address-confirmation-feature',
    MapboxAddressConfirmationFeature
  );
}
