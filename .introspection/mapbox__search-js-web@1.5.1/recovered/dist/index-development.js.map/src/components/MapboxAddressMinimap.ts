import { LngLat, LngLatLike } from '@mapbox/search-js-core';

import { HTMLScopedElement } from './HTMLScopedElement';

import {
  bindElements,
  createElementFromString,
  getElementSize
} from '../utils/dom';
import {
  Anchor,
  MapStyleMode,
  MarkerController,
  MAX_IMAGE_DIM
} from '../utils/minimap';
import { getStaticBaseUrl } from '../utils/map';

import {
  AUTOFILL_SKU_TOKEN_PREFIX,
  STATIC_BASE_URL_SATELLITE
} from '../constants';
import { getIcon, getImage, getThemeCSS, Theme } from '../theme';

import style from '../style.css';
import logo from '../icons/mapboxgl-ctrl-logo.svg';
import { deepEquals } from '../utils';
import { sendFeedback } from '../utils/contribute';

import { config } from '../config';

// TODO: Scale by device pixel ratio?
const ZOOM = 16;

const TEMPLATE = createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MapboxAddressMinimap" aria-hidden="true">
    <div class="MinimapImageContainer">
      <img class="MinimapImage" draggable="false"></img>
      <div class="MinimapInnerFrame">
        <div class="MinimapMarker"></div>
        <div class="MinimapAttribution">
          <div class="MinimapAttributionLogo">
            <a target="_blank" rel="noopener nofollow" href="https://www.mapbox.com/" aria-label="Mapbox logo">
              ${logo}
            </a>
          </div>
          <div class="MinimapAttributionText">
            <a target="_blank" href='https://www.mapbox.com/about/maps/'>© Mapbox</a><a target="_blank" href='http://www.openstreetmap.org/copyright'>© OpenStreetMap</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
`);

const STYLE_TOGGLE_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <button type="button" class="MinimapStyleToggle"></button>
</template>
`);

const FOOTER_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MinimapFooter">Adjust the marker on the map if it doesn't precisely match your location. This helps improve address data quality.</div>
</template>
`);

const ADJUST_PIN_TEXT = 'Adjust pin';
const SAVE_TEXT = 'Save';
const CANCEL_TEXT = 'Cancel';

const EDIT_BUTTONS_TEMPLATE =
  createElementFromString<HTMLTemplateElement>(/* html */ `
<template>
  <div class="MinimapEditButtons">
    <div class="Button ButtonPrimary MinimapButtonAdjust">${ADJUST_PIN_TEXT}</div>
    <div class="Button ButtonPrimary MinimapButtonSave" aria-hidden="true">${SAVE_TEXT}</div>
    <div class="Button MinimapButtonCancel" aria-hidden="true">${CANCEL_TEXT}</div>
  </div>
</template>
`);

type Binding = {
  MapboxAddressMinimap: HTMLElement;
  ImageContainer: HTMLElement;
  Image: HTMLImageElement;
  Marker: HTMLElement;
  MapStyleToggle?: HTMLElement;
  EditButtons?: HTMLElement;
  ButtonAdjust?: HTMLButtonElement;
  ButtonSave?: HTMLButtonElement;
  ButtonCancel?: HTMLButtonElement;
};

/**
 * `MapboxAddressMinimap`, also available as the element `<mapbox-address-minimap>`,
 * is a component that displays a marker for confirmation purposes.
 *
 * Optionally, this marker is editable. When editable, the marker can be moved
 * around the map and the updated location is sent back to the Mapbox Contribute
 * workflow.
 *
 * The goal of `MapboxAddressMinimap` is to reduce delivery or geolocation error in shipping and
 * local dispatching contexts.
 *
 * `MapboxAddressMinimap` expands to fill its container, and is hidden unless
 * {@link MapboxAddressMinimap#feature} is truthy. Setting {@link MapboxAddressMinimap#feature}
 * to `null` hides the component.
 *
 * @class MapboxAddressMinimap
 * @example
 * ```typescript
 * const minimap = new MapboxAddressMinimap();
 * containerElement.appendChild(minimap);
 * minimap.feature = {
 *   type: 'Feature',
 *   geometry: {
 *     type: 'Point',
 *     coordinates: [-122.4194, 37.7749]
 *   },
 *   properties: {}
 * };
 * ```
 */
export class MapboxAddressMinimap extends HTMLScopedElement {
  static observedAttributes: string[] = [
    'access-token',
    'can-adjust-marker',
    'keep-marker-centered',
    'marker-anchor',
    'satellite-toggle'
  ];

  #canAdjustMarkerInternal = false;

  /** @section {Markers} */

  /**
   * If `true`, the marker can be moved around the map. Defaults to `false`.
   *
   * When editable, the marker can be moved around the map and the updated
   * location can be referenced from the {@link MapboxAddressMinimap#onSaveMarkerLocation} callback.
   *
   * @name canAdjustMarker
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {boolean}
   */
  get canAdjustMarker(): boolean {
    return this.#canAdjustMarkerInternal;
  }
  set canAdjustMarker(val: boolean) {
    this.#canAdjustMarkerInternal = val;
    // Only try to add/remove controls if component is connected
    if (this.isConnected) {
      val ? this.#addMarkerEditControls() : this.#removeMarkerEditControls();
    }
  }
  /**
   * If `true`, the map when panned moves around the marker, keeping the marker
   * centered. Defaults to `false`.
   *
   * @name keepMarkerCentered
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {boolean}
   */
  keepMarkerCentered = false;
  /**
   * The anchor of the marker, relative to center of the expanded size. Defaults to `'bottom'`.
   *
   * @name markerAnchor
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {Anchor}
   */
  markerAnchor: Anchor = 'bottom';
  /**
   * A client-defined callback that is triggered when the "Save" button is clicked in the editing interface,
   * and gives access to the adjusted marker coordinate.
   *
   * @name onSaveMarkerLocation
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {function}
   */
  onSaveMarkerLocation: (coordinate: [number, number]) => void;

  #isAdjustMarkerEditing = false;

  #imageLoaded = false;

  #feature: GeoJSON.Feature<GeoJSON.Point>;
  #url = '';

  #width: number;
  #height: number;

  #binding: Binding;

  #markerController: MarkerController;

  #accessToken: string;

  /** @section {Input data} */

  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   *
   * If not explicitly set on the component, this will reference the value in the global config object.
   *
   * @name accessToken
   * @instance
   * @memberof MapboxAddressMinimap
   * @example
   * ```typescript
   * minimap.accessToken = 'pk.my-mapbox-access-token';
   * ```
   */
  get accessToken(): string {
    return this.#accessToken || config.accessToken;
  }
  set accessToken(newToken: string) {
    this.#accessToken = newToken;
  }

  /**
   * A [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) Feature representing
   * a [Point](https://geojson.org/geojson-spec.html#point) geometry.
   *
   * The minimap is hidden unless
   * {@link MapboxAddressMinimap#feature} is truthy. Setting {@link MapboxAddressMinimap#feature}
   * to `null` hides the component.
   *
   * @name feature
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {Feature}
   */
  get feature(): GeoJSON.Feature<GeoJSON.Point> {
    return this.#feature;
  }
  set feature(feature: GeoJSON.Feature<GeoJSON.Point>) {
    this.#feature = feature;

    if (!feature) {
      this.hide();
    } else {
      this.show();
    }
  }

  get template(): HTMLTemplateElement {
    return TEMPLATE;
  }

  get templateStyle(): string {
    return style;
  }

  get templateUserStyle(): string {
    return getThemeCSS('.MapboxAddressMinimap', this.theme);
  }

  #themeInternal: Theme = {};
  #satelliteToggleInternal = false;

  /** @section {Appearance} */

  /**
   * If `true`, the map will have an image toggle between Map and Satellite styles.
   *
   * @name satelliteToggle
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {boolean}
   */
  get satelliteToggle(): boolean {
    return this.#satelliteToggleInternal;
  }
  set satelliteToggle(val: boolean) {
    this.#satelliteToggleInternal = val;
    // Only try to add/remove toggle if component is connected
    if (this.isConnected) {
      val ? this.#addSatelliteToggle() : this.#removeSatelliteToggle();
    }
  }

  /**
   * The {@link Theme} to use for styling the editing interface.
   *
   * @name theme
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {Theme}
   * @example
   * ```typescript
   * autofill.theme = {
   *   variables: {
   *     colorPrimary: 'myBrandRed'
   *   }
   * };
   * ```
   */
  get theme(): Theme {
    return this.#themeInternal;
  }
  set theme(theme: Theme) {
    this.#themeInternal = theme;

    if (!this.#binding || !theme) {
      return;
    }

    this.updateTemplateUserStyle(getThemeCSS('.MapboxAddressMinimap', theme));

    const { Marker, MapStyleToggle } = this.#binding;
    Marker.innerHTML = getIcon('marker', theme);
    if (MapStyleToggle) {
      MapStyleToggle.style.backgroundImage = this.#getToggleBackgroundImageUrl(
        this.mapStyleMode === 'default' ? 'satellite' : 'default'
      );
    }
  }

  #mapStyleMode: MapStyleMode = 'default';

  #adjustBtnText;
  /**
   * Custom adjust button text appearing on the map.
   * If not provided, the default text will be used.
   *
   * @name adjustBtnText
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {string}
   */
  get adjustBtnText(): string {
    return this.#adjustBtnText || ADJUST_PIN_TEXT;
  }
  set adjustBtnText(val: string) {
    this.#adjustBtnText = val;
    const adjustBtn = this.querySelector('.MinimapButtonAdjust');
    adjustBtn.textContent = val || ADJUST_PIN_TEXT;
  }

  #saveBtnText;
  /**
   * Custom save button text appearing on the map, when marker adjustment is enabled.
   * If not provided, the default text will be used.
   *
   * @name saveBtnText
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {string}
   */
  get saveBtnText(): string {
    return this.#saveBtnText || SAVE_TEXT;
  }
  set saveBtnText(val: string) {
    this.#saveBtnText = val;
    const saveBtn = this.querySelector('.MinimapButtonSave');
    saveBtn.textContent = val || SAVE_TEXT;
  }

  #cancelBtnText;
  /**
   * Custom cancel button text appearing on the map, when marker adjustment is enabled.
   * If not provided, the default text will be used.
   *
   * @name cancelBtnText
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {string}
   */
  get cancelBtnText(): string {
    return this.#cancelBtnText || CANCEL_TEXT;
  }
  set cancelBtnText(val: string) {
    this.#cancelBtnText = val;
    const cancelBtn = this.querySelector('.MinimapButtonCancel');
    cancelBtn.textContent = val || CANCEL_TEXT;
  }

  /**
   * The map style to use, either `'default'` or `'satellite'`. The default map
   * style is configurable with {@link MapboxAddressMinimap#defaultMapStyle}.
   *
   * @name mapStyleMode
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {'default' | 'satellite'}
   */
  get mapStyleMode(): MapStyleMode {
    return this.#mapStyleMode;
  }
  set mapStyleMode(styleMode: MapStyleMode) {
    const prevStyleMode = this.#mapStyleMode;
    if (prevStyleMode === styleMode) return;

    this.#mapStyleMode = styleMode;
    if (!this.#binding) {
      return;
    }

    // Update toggle button background image
    const { MapStyleToggle } = this.#binding;
    if (!MapStyleToggle) {
      return;
    }

    MapStyleToggle.style.backgroundImage =
      this.#getToggleBackgroundImageUrl(prevStyleMode);
    // Update title attribute
    MapStyleToggle.setAttribute(
      'title',
      `Switch to ${prevStyleMode === 'satellite' ? 'Satellite' : 'Default'}`
    );
    this.#updateImageSrc();
  }

  #defaultMapStyle: [string, string] = ['mapbox', 'streets-v11'];

  /**
   * The map style to use for the default map style. Defaults to `['mapbox', 'streets-v11']`.
   *
   * @name defaultMapStyle
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {[string, string]}
   */
  get defaultMapStyle(): [string, string] {
    return this.#defaultMapStyle;
  }
  set defaultMapStyle(style: [string, string]) {
    this.#defaultMapStyle = style;
    this.#updateImageSrc();
  }

  #footer: boolean | string;

  /**
   * Custom footer text appearing below the map, when marker adjustment is enabled.
   * If `true` or left undefined, the default footer text will be used.
   * If `false`, the footer will not be shown.
   *
   * @name footer
   * @instance
   * @memberof MapboxAddressMinimap
   * @type {boolean | string}
   */
  get footer(): boolean | string {
    return this.#footer;
  }
  set footer(val: boolean | string) {
    this.#footer = val;
    const footerEl = this.querySelector<HTMLDivElement>('.MinimapFooter');
    if (footerEl) {
      if (typeof val === 'string') {
        footerEl.textContent = val;
        footerEl.removeAttribute('aria-hidden');
      } else if (!val) {
        footerEl.setAttribute('aria-hidden', 'true');
      } else {
        footerEl.removeAttribute('aria-hidden');
      }
    }
  }

  /**
   * @deprecated Use `container` instead.
   */
  #container: HTMLElement | null;

  get container(): HTMLElement | null {
    return this.#container;
  }

  set container(newContainer: HTMLElement | null) {
    if (newContainer) {
      newContainer.style.position = 'relative';
      this.#container = newContainer;
    }
  }

  /** @section {Methods} */

  /**
   * If {@link MapboxAddressMinimap#feature} is truthy, show the minimap.
   */
  show(): void {
    if (!this.#feature) {
      return;
    }

    const lngLat = this.#feature.geometry.coordinates;
    this.#markerController.coordinate = lngLat as [number, number];

    this.#url = this.#getImageUrl(lngLat as [number, number]);

    // Update image.
    const { MapboxAddressMinimap, Image } = this.#binding;
    Image.src = this.#url;

    MapboxAddressMinimap.removeAttribute('aria-hidden');
  }

  /**
   * Hide the minimap.
   */
  hide(): void {
    const { MapboxAddressMinimap } = this.#binding;
    MapboxAddressMinimap.setAttribute('aria-hidden', 'true');
  }

  #toggleMarkerEditing = (): void => {
    const { ImageContainer, ButtonAdjust, ButtonSave, ButtonCancel } =
      this.#binding;
    if (this.#isAdjustMarkerEditing) {
      ImageContainer.classList.add(`${this.dataset.seed}--draggable`);
      this.#markerController.isActive = true;
      ButtonAdjust.setAttribute('aria-hidden', 'true');
      ButtonSave.removeAttribute('aria-hidden');
      ButtonCancel.removeAttribute('aria-hidden');
    } else {
      ImageContainer.classList.remove(`${this.dataset.seed}--draggable`);
      this.#markerController.isActive = false;
      ButtonAdjust.removeAttribute('aria-hidden');
      ButtonSave.setAttribute('aria-hidden', 'true');
      ButtonCancel.setAttribute('aria-hidden', 'true');
    }
  };

  #handleStartMarkerEditing = (): void => {
    this.#isAdjustMarkerEditing = true;
    this.#toggleMarkerEditing();
  };

  #handleSaveMarkerEditing = (): void => {
    // Send feedback to Contribute API if feature includes address info, and the marker location has changed
    if (
      this.feature.properties.full_address &&
      !deepEquals(
        this.feature.geometry.coordinates,
        this.#markerController.coordinate
      )
    ) {
      const [lng, lat] = this.#markerController.coordinate;
      sendFeedback(this.accessToken, {
        originalCoordinate: this.feature.geometry.coordinates as [
          number,
          number
        ],
        originalAddress: this.feature.properties.full_address,
        changes: {
          location: { longitude: lng, latitude: lat }
        },
        labels: ['address_minimap']
      });
    }
    // Client-defined callback
    if (this.onSaveMarkerLocation) {
      this.onSaveMarkerLocation(this.#markerController.coordinate);
    }
    // Update component state
    this.#isAdjustMarkerEditing = false;
    this.#toggleMarkerEditing();
  };

  #handleCancelMarkerEditing = (): void => {
    this.#markerController.reCenter();
    this.#isAdjustMarkerEditing = false;
    this.#toggleMarkerEditing();
  };

  #handleToggleMapStyle = (): void => {
    this.mapStyleMode =
      this.mapStyleMode === 'default' ? 'satellite' : 'default';
  };

  #handleImageLoad = (): void => {
    if (!this.#imageLoaded) {
      this.#markerController.reCenter();
    }
    this.#imageLoaded = true;
    this.#markerController && this.#markerController.handleMinimapResize();
  };

  #handleImageError = (): void => {
    this.#imageLoaded = false;
  };

  /**
   * Get the Static Image API URL for a given coordinate.
   * Attempts to get an image twice as large as the container to enable panning,
   * while constraining to the static API size limits.
   * @param lngLatLike - The coordinate representing the center of the image
   * @returns
   */
  #getImageUrl = (lngLatLike: LngLatLike): string => {
    // Return empty string if height or width is 0 to prevent 422 error
    if (this.#width === 0 || this.#height === 0) return '';

    const [username, styleId] = this.defaultMapStyle;
    const defaultBaseUrl = getStaticBaseUrl(username, styleId);
    const baseUrl =
      this.mapStyleMode === 'default'
        ? defaultBaseUrl
        : STATIC_BASE_URL_SATELLITE;
    const skuToken =
      AUTOFILL_SKU_TOKEN_PREFIX + config.autofillSessionToken.toString();
    let imgUrl =
      baseUrl +
      LngLat.convert(lngLatLike).toArray().join(',') +
      ',' +
      ZOOM +
      ',0/' +
      Math.min(this.#width * 2, MAX_IMAGE_DIM) +
      'x' +
      Math.min(this.#height * 2, MAX_IMAGE_DIM) +
      '?access_token=' +
      this.accessToken +
      '&attribution=false' +
      '&logo=false';
    if (config.autofillSessionEnabled) {
      imgUrl += `&sku=${skuToken}`;
    }
    return imgUrl;
  };

  #updateImageSrc = (): void => {
    if (this.#feature) {
      const lngLat = this.#feature.geometry.coordinates;
      this.#url = this.#getImageUrl(lngLat as [number, number]);
      const { Image } = this.#binding;
      Image.src = this.#url;
    }
  };

  #getToggleBackgroundImageUrl = (styleMode: MapStyleMode): string => {
    return `url("${getImage(
      styleMode === 'default' ? 'styleToggleDefault' : 'styleToggleSatellite',
      this.theme
    )}")`;
  };

  #setSize = (): void => {
    const { MapboxAddressMinimap, ImageContainer, Image } = this.#binding;
    const { width, height } = getElementSize(this.container);
    const [oldWidth, oldHeight] = [this.#width, this.#height];
    this.#width = Math.min(width, MAX_IMAGE_DIM); // Constrain to Static Image API limit
    this.#height = Math.min(height, MAX_IMAGE_DIM); // Constrain to Static Image API limit
    MapboxAddressMinimap.style.setProperty('width', `${this.#width}px`);
    MapboxAddressMinimap.style.setProperty('height', `${this.#height}px`);
    ImageContainer.style.setProperty('height', `${this.#height}px`);
    ImageContainer.style.setProperty('width', `${this.#width}px`);
    const [imgWidth, imgHeight] = [Image.width, Image.height];

    /**
     * Conditionally update the <img> src URL.
     * Only updates if ALL of the following conditions are met:
     * 1. The Minimap is INCREASING in X or Y dimension
     * 2. The Minimap dimension is greater than half the <img> dimension (we want to aim for twice the extents for panning)
     * 3. The <img> dimension is smaller than the maximum per Static Image API (i.e. it still has room to be sized up)
     */
    if (
      (this.#width > oldWidth &&
        this.#width > imgWidth / 2 &&
        imgWidth < MAX_IMAGE_DIM) ||
      (this.#height > oldHeight &&
        this.#height > imgHeight / 2 &&
        imgHeight < MAX_IMAGE_DIM)
    ) {
      this.#updateImageSrc();
    } else {
      this.#markerController && this.#markerController.handleMinimapResize();
    }
  };

  #addMarkerEditControls = (): void => {
    // Footer
    const existingFooter = this.querySelector('.MinimapFooter');
    if (existingFooter) return;
    const footerElement = this.prepareTemplate(FOOTER_TEMPLATE);
    const minimapElement = this.querySelector('.MapboxAddressMinimap');
    if (!minimapElement) return;
    minimapElement.appendChild(footerElement);

    // Edit buttons
    const existingEditBtns = this.querySelector('.MinimapEditButtons');
    if (existingEditBtns) return;
    const editButtonsElement = this.prepareTemplate(EDIT_BUTTONS_TEMPLATE);
    const innerFrame = this.querySelector('.MinimapInnerFrame');
    if (!innerFrame) return;
    innerFrame.appendChild(editButtonsElement);

    // Add to or update object binding
    this.#binding = {
      ...this.#binding,
      EditButtons: this.querySelector('.MinimapEditButtons'),
      ButtonAdjust: this.querySelector('.MinimapButtonAdjust'),
      ButtonSave: this.querySelector('.MinimapButtonSave'),
      ButtonCancel: this.querySelector('.MinimapButtonCancel')
    };

    // Bind callbacks to button click events
    const { ButtonAdjust, ButtonSave, ButtonCancel } = this.#binding;
    ButtonAdjust.addEventListener('click', this.#handleStartMarkerEditing);
    ButtonSave.addEventListener('click', this.#handleSaveMarkerEditing);
    ButtonCancel.addEventListener('click', this.#handleCancelMarkerEditing);
  };

  #removeMarkerEditControls = (): void => {
    if (!this.#binding) return;
    const { EditButtons, ButtonAdjust, ButtonSave, ButtonCancel } =
      this.#binding;

    const existingFooter = this.querySelector('.MinimapFooter');
    existingFooter?.remove();
    EditButtons?.remove();
    if (ButtonAdjust) {
      ButtonAdjust.remove();
      ButtonAdjust.removeEventListener('click', this.#handleStartMarkerEditing);
    }
    if (ButtonSave) {
      ButtonSave.remove();
      ButtonSave.removeEventListener('click', this.#handleSaveMarkerEditing);
    }
    if (ButtonCancel) {
      ButtonCancel.remove();
      ButtonCancel.removeEventListener(
        'click',
        this.#handleCancelMarkerEditing
      );
    }

    delete this.#binding.EditButtons;
    delete this.#binding.ButtonAdjust;
    delete this.#binding.ButtonSave;
    delete this.#binding.ButtonCancel;
  };

  #addSatelliteToggle = (): void => {
    const existingToggle = this.querySelector('.MinimapStyleToggle');
    if (existingToggle) return;

    // Add element to DOM
    const toggleElement = this.prepareTemplate(STYLE_TOGGLE_TEMPLATE);
    const innerFrame = this.querySelector('.MinimapInnerFrame');
    if (!innerFrame) return;
    innerFrame.appendChild(toggleElement);

    // Add to or update object binding
    this.#binding.MapStyleToggle = toggleElement;

    // Bind callback
    toggleElement.addEventListener('click', this.#handleToggleMapStyle);
    // Initialize background image
    toggleElement.style.backgroundImage = this.#getToggleBackgroundImageUrl(
      this.mapStyleMode === 'default' ? 'satellite' : 'default'
    );
    toggleElement.setAttribute(
      'title',
      `Switch to ${this.mapStyleMode === 'default' ? 'Satellite' : 'Default'}`
    );
  };

  #removeSatelliteToggle = (): void => {
    if (!this.#binding) return;
    const { MapStyleToggle } = this.#binding;
    if (!MapStyleToggle) return;

    MapStyleToggle.remove();
    MapStyleToggle.removeEventListener('click', this.#handleToggleMapStyle);

    delete this.#binding.MapStyleToggle;
  };

  connectedCallback(): void {
    super.connectedCallback();

    this.#binding = bindElements<Binding>(this, {
      MapboxAddressMinimap: '.MapboxAddressMinimap',
      ImageContainer: '.MinimapImageContainer',
      Image: '.MinimapImage',
      Marker: '.MinimapMarker',
      MapStyleToggle: '.MinimapStyleToggle',
      EditButtons: '.MinimapEditButtons',
      ButtonAdjust: '.MinimapButtonAdjust',
      ButtonSave: '.MinimapButtonSave',
      ButtonCancel: '.MinimapButtonCancel'
    });

    // Update toggle button background image.
    this.mapStyleMode = this.#mapStyleMode;

    // Initialize theme if not set before connectedCallback
    this.theme = { ...this.theme };

    // Append buttons and footer if adjustable (re-check after connected)
    if (this.#canAdjustMarkerInternal && !this.#binding.EditButtons) {
      this.#addMarkerEditControls();
    }

    // Append style toggle if enabled (re-check after connected)
    if (this.#satelliteToggleInternal && !this.#binding.MapStyleToggle) {
      this.#addSatelliteToggle();
    }

    // Calculate size and listen for changes
    this.container = this.parentElement;
    const resizeObserver = new ResizeObserver(this.#setSize);
    resizeObserver.observe(this.container);
    this.#setSize();

    const { MapboxAddressMinimap, ImageContainer, Image, Marker } =
      this.#binding;

    // Initialize marker controller
    this.#markerController = new MarkerController(
      ImageContainer,
      Image,
      Marker,
      this.keepMarkerCentered,
      ZOOM,
      this.markerAnchor
    );
    this.#markerController.reCenter();
    Image.onload = this.#handleImageLoad;
    Image.onerror = this.#handleImageError;

    Image.src = this.#url;

    if (this.#feature) MapboxAddressMinimap.removeAttribute('aria-hidden');
    else MapboxAddressMinimap.setAttribute('aria-hidden', 'true');
  }

  attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string
  ): void {
    if (name === 'access-token') {
      this.accessToken = newValue;
    } else if (name === 'can-adjust-marker') {
      this.canAdjustMarker = ['true', ''].includes(newValue);
    } else if (name === 'keep-marker-centered') {
      this.keepMarkerCentered = ['true', ''].includes(newValue);
    } else if (name === 'marker-anchor') {
      const newAnchor = newValue as Anchor;
      this.markerAnchor = newAnchor;
      this.#markerController && (this.#markerController.anchor = newAnchor);
    } else if (name === 'satellite-toggle') {
      this.satelliteToggle = ['true', ''].includes(newValue);
    }
  }
}

declare global {
  interface Window {
    MapboxAddressMinimap: typeof MapboxAddressMinimap;
  }
}

window.MapboxAddressMinimap = MapboxAddressMinimap;

if (!window.customElements.get('mapbox-address-minimap')) {
  customElements.define('mapbox-address-minimap', MapboxAddressMinimap);
}
