import { SessionToken } from '@mapbox/search-js-core';

class Config {
  /**
   * A Mapbox access token used if one is not passed in explicitly to web components
   */
  accessToken: string;
  /**
   * If true, Address Autofill address or marker location corrections will be submitted to the Mapbox Contribute API to help improve our data accuracy. Defaults to true.
   */
  feedbackEnabled = true;

  readonly autofillSessionToken = new SessionToken(); // Shared session token used among Address Autofill-related web components
  autofillSessionEnabled = false; // True when Address Autofill has been initialized within the current page view
  detectBrowserAutofillEnabled = false; // True when `initDetectBrowserAutofill` has been called
}

/**
 * Global configuration singleton object storing settings shared across Search JS Web components.
 *
 * @property {string} accessToken - A [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) used if one is not passed in explicitly to web components.
 * @property {boolean} feedbackEnabled - If true, Address Autofill address or marker location corrections will be submitted to the Mapbox Contribute API to help improve our data accuracy. Defaults to true.
 * @example
 * ```typescript
 * config.accessToken = 'pk.abc.123';
 * ...
 * // Don't need to explicitly pass in token to some components
 * autofill({});
 * confirmAddress(form);
 * ```
 */
const config = new Config();

// Prevent autofillSessionToken from being overwritten
Object.defineProperty(config, 'autofillSessionToken', {
  configurable: false,
  writable: false
});

export { config };
