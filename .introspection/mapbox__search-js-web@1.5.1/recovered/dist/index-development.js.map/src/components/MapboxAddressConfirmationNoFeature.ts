import { HTMLScopedElement } from './HTMLScopedElement';
import { AddressConfirmationEventTypes } from './MapboxAddressConfirmation';

import { randomValidID } from '../utils';
import { bindElements, createElementFromString } from '../utils/dom';
import { ariaButtonKeyDown } from '../utils/aria';
import { AutofillValueMap } from '../utils/autofill';
import {
  AddressConfirmShowResult,
  createAddressElement
} from '../utils/confirmation';

import { MapboxHTMLEvent } from '../MapboxHTMLEvent';
import { getIcon, getThemeCSS, Theme } from '../theme';

import style from '../style.css';

const TEMPLATE = createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MapboxAddressConfirmationNoFeature">
    <div class="Modal" aria-modal="true" role="dialog">
      <div class="ModalHeader">
        <svg viewBox="0 0 18 18" class="Icon IconQuestion"></svg>
        <div class="ModalHeaderTitle">Confirm address</div>
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
      <div class="ModalDescription">
        We couldn't verify this address. Please check that your information is correct before continuing.
      </div>
      <br />
      <div class="ModalSubheader">
        You entered
      </div>
      <div class="ModalAddress"></div>
      <div
        class="Button ButtonPrimary"
        tabindex="0"
        role="button"
        aria-label="Use the address I provided"
      >
        Use the address I provided
      </div>
    </div>
  </div>
</template>
`);

type Binding = {
  Modal: HTMLDivElement;
  ModalHeaderTitle: HTMLDivElement;

  IconQuestion: SVGSVGElement;
  IconClose: SVGSVGElement;

  ButtonReject: HTMLDivElement;

  ModalAddress: HTMLDivElement;
};

/**
 * {@link MapboxAddressConfirmationNoFeature} is a custom element that
 * will display a notification when an address entered into an HTML form
 * does not return any features when queried against the Address Autofill API.
 *
 * This element is hosted by {@link MapboxAddressConfirmation} and should not be exposed to the user.
 */
export class MapboxAddressConfirmationNoFeature extends HTMLScopedElement<AddressConfirmationEventTypes> {
  #binding: Binding;

  get template(): HTMLTemplateElement {
    return TEMPLATE;
  }

  get templateStyle(): string {
    return style;
  }

  get templateUserStyle(): string {
    return getThemeCSS('.MapboxAddressConfirmationNoFeature', this.theme);
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
      getThemeCSS('.MapboxAddressConfirmationNoFeature', theme)
    );

    const { IconQuestion, IconClose } = this.#binding;

    IconQuestion.innerHTML = getIcon('question', theme);
    IconClose.innerHTML = getIcon('close', theme);
  }

  /**
   * Update modal content with user-provided address
   * @param autofillValues - User-provided input values from address fields
   */
  update = (autofillValues: AutofillValueMap): void => {
    // Set the text of the approve address.
    const { ModalAddress } = this.#binding;
    ModalAddress.innerHTML = '';
    ModalAddress.appendChild(createAddressElement(autofillValues));
  };

  #handleClose = (): void => {
    this.dispatchEvent(
      new MapboxHTMLEvent<AddressConfirmShowResult['type']>('result', 'cancel')
    );
  };

  reject = (): void => {
    this.dispatchEvent(
      new MapboxHTMLEvent<AddressConfirmShowResult['type']>(
        'result',
        'nochange'
      )
    );
  };

  // IDs to connect for ARIA.
  #modalID = randomValidID();
  #modalHeaderTitleID = randomValidID();
  #modalAddressID = randomValidID();

  connectedCallback(): void {
    super.connectedCallback();

    this.#binding = bindElements<Binding>(this, {
      Modal: '.Modal',
      ModalHeaderTitle: '.ModalHeaderTitle',

      IconQuestion: '.IconQuestion',
      IconClose: '.IconClose',

      ModalAddress: '.ModalAddress',

      ButtonReject: '.Button'
    });

    const { Modal, ModalHeaderTitle, IconClose, ModalAddress, ButtonReject } =
      this.#binding;

    // Setup IDREFs for WAI-ARIA.
    Modal.setAttribute('aria-labelledby', this.#modalHeaderTitleID);
    Modal.setAttribute('aria-describedby', this.#modalAddressID);
    IconClose.setAttribute('aria-controls', this.#modalID);

    Modal.id = this.#modalID;
    ModalHeaderTitle.id = this.#modalHeaderTitleID;
    ModalAddress.id = this.#modalAddressID;

    // Setup WAI-ARIA button keyboard events.
    const buttons = Array.from(this.querySelectorAll('[role="button"]'));
    for (const button of buttons) {
      button.addEventListener('keydown', ariaButtonKeyDown);
    }

    // Setup event listeners.
    IconClose.addEventListener('click', this.#handleClose);
    ButtonReject.addEventListener('click', this.reject);

    const theme = this.theme;
    if (theme) {
      const { IconQuestion, IconClose } = this.#binding;

      IconQuestion.innerHTML = getIcon('question', theme);
      IconClose.innerHTML = getIcon('close', theme);
    }
  }

  disconnectedCallback(): void {
    const { IconClose, ButtonReject } = this.#binding;

    // Make sure to unbind event listeners.
    IconClose.removeEventListener('click', this.#handleClose);
    ButtonReject.removeEventListener('click', this.reject);
  }
}

declare global {
  interface Window {
    MapboxAddressConfirmationNoFeature: typeof MapboxAddressConfirmationNoFeature;
  }
}

window.MapboxAddressConfirmationNoFeature = MapboxAddressConfirmationNoFeature;

if (!window.customElements.get('mapbox-address-confirmation-no-feature')) {
  customElements.define(
    'mapbox-address-confirmation-no-feature',
    MapboxAddressConfirmationNoFeature
  );
}
