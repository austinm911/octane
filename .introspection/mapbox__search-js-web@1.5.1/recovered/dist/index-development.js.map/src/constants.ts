import { createElementFromString } from './utils/dom';
import { getStaticBaseUrl } from './utils/map';
import closeIcon from './icons/close.svg';
import loadingIcon from './icons/loading.svg';

export const STATIC_BASE_URL_SATELLITE = getStaticBaseUrl(
  'mapbox',
  'satellite-streets-v11'
);

export const AUTOFILL_SKU_TOKEN_PREFIX = '20d01';

export const MAPBOX_DOMAINS = ['mapbox.com', 'mapbox.cn', 'tilestream.net'];

export const LISTBOX_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MapboxSearch">
    <div class="Label" role="label" aria-live="polite" aria-atomic="true">
    </div>
    <div class="Results" aria-hidden="true">
      <div class="ResultsList" role="listbox">
      </div>
      <div class="ResultsAttribution" aria-hidden="true">
        <a href="https://www.mapbox.com/search-service" target="_blank" tabindex="-1">
          Powered by Mapbox
        </a>
      </div>
    </div>
  </div>
</template>
`);

export const LISTBOX_SUGGESTION_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="Suggestion" role="option" tabindex="-1">
    <div class="SuggestionIcon" aria-hidden="true"></div>
    <div class="SuggestionText">
      <div class="SuggestionName"></div>
      <div class="SuggestionDesc"></div>
    </div>
  </div>
</template>
`);

export const SEARCHBOX_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="SearchBox">
    <div class="SearchIcon"></div>
    <input class="Input" type="text" />
    <div class="ActionIcon">
      <button aria-label="Clear" class="ClearBtn" type="button">${closeIcon}</button>
      <div class="LoadingIcon">${loadingIcon}</div>
    </div>
  </div>
</template>
`);

export const GEOCODER_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="Geocoder">
    <div class="SearchIcon"></div>
    <input class="Input" type="text" />
    <div class="ActionIcon">
      <button aria-label="Clear" class="ClearBtn" type="button">${closeIcon}</button>
      <div class="LoadingIcon">${loadingIcon}</div>
    </div>
  </div>
</template>
`);
