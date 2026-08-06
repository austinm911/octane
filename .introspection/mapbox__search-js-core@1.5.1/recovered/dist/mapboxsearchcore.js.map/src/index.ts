import {
  AddressAutofillOptions,
  AddressAutofillCore,
  AddressAutofillSuggestionResponse,
  AddressAutofillRetrieveResponse
} from './autofill/AddressAutofillCore';
import {
  AddressAutofillSuggestion,
  AddressAutofillFeatureSuggestion,
  AddressAutofillFeatureContextComponent
} from './autofill/types';

import {
  SearchBoxOptions,
  SearchBoxCore,
  SearchBoxSuggestionResponse,
  SearchBoxRetrieveResponse,
  SearchBoxCategoryResponse,
  SearchBoxReverseResponse
} from './searchbox/SearchBoxCore';
import {
  SearchBoxAdministrativeUnitTypes,
  SearchBoxSuggestion,
  SearchBoxFeatureSuggestion,
  SearchBoxCategorySuggestion
} from './searchbox/types';

import {
  ValidationOptions,
  ValidationCore,
  ValidationResponse
} from './validate/ValidationCore';
import { ValidationFeature } from './validate/types';

import {
  GeocodingOptions,
  GeocodingCore,
  GeocodingResponse
} from './geocode/GeocodingCore';
import {
  GeocodingFeatureProperties,
  GeocodingFeatureContext,
  GeocodingFeatureContextComponent,
  GeocodingFeature,
  FeatureTypes,
  Coordinates,
  RoutablePoint
} from './geocode/types';

import { MatchCode, MatchCodeType, MatchCodeConfidence } from './types';

import { SearchSession } from './SearchSession';
import { SessionToken, SessionTokenLike } from './SessionToken';
import { MapboxError } from './MapboxError';

import { LngLat, LngLatLike } from './LngLat';
import { LngLatBounds, LngLatBoundsLike } from './LngLatBounds';

import { polyfillFetch } from './fetch';
import { featureToSuggestion } from './featureToSuggestion';

import { Evented } from './utils/Evented';
import { debounce } from './utils/debounce';

export {
  // Search Box
  SearchBoxOptions,
  SearchBoxCore,
  SearchBoxSuggestionResponse,
  SearchBoxRetrieveResponse,
  SearchBoxAdministrativeUnitTypes,
  SearchBoxSuggestion,
  SearchBoxFeatureSuggestion,
  SearchBoxCategoryResponse,
  SearchBoxReverseResponse,
  SearchBoxCategorySuggestion,
  // Address Autofill
  AddressAutofillOptions,
  AddressAutofillCore,
  AddressAutofillSuggestionResponse,
  AddressAutofillRetrieveResponse,
  AddressAutofillSuggestion,
  AddressAutofillFeatureSuggestion,
  AddressAutofillFeatureContextComponent,
  // Shared
  MatchCode,
  MatchCodeType,
  MatchCodeConfidence,
  SearchSession,
  SessionToken,
  SessionTokenLike,
  MapboxError,
  LngLat,
  LngLatLike,
  LngLatBounds,
  LngLatBoundsLike,
  polyfillFetch,
  featureToSuggestion,
  Evented,
  debounce,
  // Autofill Validation
  ValidationOptions,
  ValidationCore,
  ValidationResponse,
  ValidationFeature,
  // Geocoding (v6)
  GeocodingOptions,
  GeocodingCore,
  GeocodingResponse,
  GeocodingFeatureProperties,
  GeocodingFeatureContext,
  GeocodingFeature,
  GeocodingFeatureContextComponent,
  FeatureTypes,
  Coordinates,
  RoutablePoint,
  // ALIASES FOR BACKWARD COMPATIBILITY
  AddressAutofillOptions as AutofillOptions,
  AddressAutofillCore as MapboxAutofill,
  AddressAutofillSuggestionResponse as AutofillSuggestionResponse,
  AddressAutofillRetrieveResponse as AutofillRetrieveResponse,
  AddressAutofillSuggestion as AutofillSuggestion,
  AddressAutofillFeatureSuggestion as AutofillFeatureSuggestion,
  ValidationOptions as ValidateOptions,
  ValidationCore as MapboxValidate,
  ValidationResponse as ValidateResponse,
  ValidationFeature as ValidateFeature,
  GeocodingOptions as GeocodeOptions,
  GeocodingCore as MapboxGeocode,
  GeocodingResponse as GeocodeResponse,
  GeocodingFeatureProperties as GeocodeFeatureProperties,
  GeocodingFeatureContext as GeocodeFeatureContext,
  GeocodingFeature as GeocodeFeature
};
