/**
 * Detects browser autofill events and emits custom events
 * Reference: https://github.com/matteobad/detect-autofill
 */

import { debounce } from '@mapbox/search-js-core';

import { addDocumentStyle } from './dom';

import browserAutofillCss from './detect_browser_autofill.css';
import { config } from '../config';
import { MapboxHTMLEvent } from '../MapboxHTMLEvent';

// Note: if we decide to support legacy browsers in future, we may need to polyfill CustomEvent
// import 'custom-event-polyfill';

export const ATTR_NAME = 'browser-autofilled';
let AUTOFILLED_ELEMENTS: HTMLElement[] = [];

function dispatchBrowserAutofillEvent() {
  window.dispatchEvent(
    new window.CustomEvent('browserautofill', {
      bubbles: true,
      cancelable: true,
      detail: { elements: AUTOFILLED_ELEMENTS }
    })
  );
  AUTOFILLED_ELEMENTS = []; // reset element array
}

/**
 * Debounce interval set at 5ms, as it seems like the delay between successive fields (i.e. inputs)
 * being autofilled by the browser is roughly 1-2ms.
 *
 * This ensures that all fields affected by the autofill event have been populated before signaling
 * the event to the rest of the application.
 */
const debouncedAutofill = debounce(dispatchBrowserAutofillEvent, 5);

/**
 * Manage an input element when its value is autocompleted
 * by the browser
 *
 * @param {HtmlInputElement} element
 */
export function browserAutofill(element: HTMLInputElement): void {
  if (element.hasAttribute(ATTR_NAME)) return;
  element.setAttribute(ATTR_NAME, '');

  AUTOFILLED_ELEMENTS.push(element);

  debouncedAutofill();
}

/**
 * Manage an input element when its autocompleted value is
 * removed by the browser
 *
 * @param {HtmlInputElement} element
 */
export function cancelBrowserAutofill(element: HTMLInputElement): void {
  if (!element.hasAttribute(ATTR_NAME)) return;
  element.removeAttribute(ATTR_NAME);
}

/**
 * Handler for -webkit based browser that listen for a custom
 * animation create using the :pseudo-selector in the stylesheet.
 * Works with Chrome, Safari
 *
 * @param {AnimationEvent} event
 */
export function onAnimationStart(event: AnimationEvent): void {
  'onbrowserautofillstart' === event.animationName
    ? browserAutofill(event.target as HTMLInputElement)
    : cancelBrowserAutofill(event.target as HTMLInputElement);
}

/**
 * Handler for non-webkit based browser that listen for input
 * event to trigger the autocomplete-cancel process.
 * Works with Firefox, Edge, IE11
 *
 * @param {InputEvent} event
 */
export function onInput(event: InputEvent): void {
  const targetEl = event.target as HTMLInputElement;
  targetEl.nodeName.toLowerCase() !== 'select' &&
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  !(event as any).simulated &&
  !(event instanceof MapboxHTMLEvent) &&
  ('insertReplacementText' === event.inputType || !('data' in event))
    ? browserAutofill(targetEl)
    : cancelBrowserAutofill(targetEl);
}

/**
 * Enables detection of browser autofill events
 */
export function initDetectBrowserAutofill(): void {
  // Set global state to ensure event listeners aren't duplicated
  if (config.detectBrowserAutofillEnabled) {
    return;
  } else {
    config.detectBrowserAutofillEnabled = true;
  }

  addDocumentStyle(browserAutofillCss);
  document.addEventListener('animationstart', onAnimationStart, true);
  document.addEventListener('input', onInput, true);
}
