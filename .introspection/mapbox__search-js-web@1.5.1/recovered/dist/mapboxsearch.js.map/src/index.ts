/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable spaced-comment */

/// <reference path="./types/custom_elements.d.ts" />
/// <reference path="./types/typehead.d.ts" />

import './components/MapboxSearchListbox';
import './components/MapboxAddressConfirmationFeature';
import './components/MapboxAddressConfirmationNoFeature';

export {
  MapboxAddressConfirmation,
  AddressConfirmOptions,
  ConfirmationMinimapOptions
} from './components/MapboxAddressConfirmation';

export { MapboxAddressAutofill } from './components/MapboxAddressAutofill';
export {
  MapboxSearchBox,
  MapboxSearchBoxComponentOptions
} from './components/MapboxSearchBox';
export {
  MapboxGeocoder,
  MapboxGeocoderComponentOptions
} from './components/MapboxGeocoder';

export { MapboxAddressMinimap } from './components/MapboxAddressMinimap';

export { MapboxHTMLEvent } from './MapboxHTMLEvent';
export { Theme } from './theme';

export {
  autofill,
  AddressAutofillCollectionOptions,
  AddressAutofillCollectionOptions as AutofillCollectionOptions // alias for backward compatibility
} from './autofill';
export { confirmAddress } from './confirmAddress';

export { MapStyleMode, Anchor } from './utils/minimap';
export { AddressConfirmShowResult } from './utils/confirmation';
export {
  getFormAutofillValues,
  getAutofillSearchText,
  AutofillValueMap
} from './utils/autofill';
export { PopoverOptions } from './utils/popover';

export { config } from './config';
