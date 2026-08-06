import SphericalMercator from '@mapbox/sphericalmercator';
import { deepEquals, round } from '.';
import { getElementSize } from './dom';

export type MapStyleMode = 'default' | 'satellite';

/**
 * Valid strings for setting `markerAnchor` on {@link MapboxAddressMinimap}
 *
 * @typedef Anchor
 */
export type Anchor =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

// eslint-disable-next-line
// @ts-ignore
const merc = new SphericalMercator({ size: 512, antimeridian: true });

export const MAX_IMAGE_DIM = 1280;

interface MarkerTransform {
  /** X offset to correct for anchor position */
  anchorX: number;
  /** Y offset to correct for anchor position */
  anchorY: number;
  /** X offset from manual marker movement */
  globalX: number;
  /** Y offset from manual marker movement */
  globalY: number;
  correctionX: number;
  correctionY: number;
}

/**
 * Get the [X,Y] pixel offset for a given SVG marker and anchor definition
 * @param marker - An SVG element used as the marker
 * @param anchor - The anchor point of the marker to put closest to the marked coordinate
 * @returns [X,Y] pixel coordinate
 */
export function getAnchorOffset(
  marker: HTMLElement,
  anchor: Anchor
): [number, number] {
  const { width, height } = getElementSize(marker, true);
  switch (anchor) {
    case 'center':
      return [0, 0];
    case 'top':
      return [0, height / 2];
    case 'bottom':
      return [0, (-1 * height) / 2];
    case 'left':
      return [width / 2, 0];
    case 'right':
      return [(-1 * width) / 2, 0];
    case 'top-left':
      return [width / 2, height / 2];
    case 'top-right':
      return [(-1 * width) / 2, height / 2];
    case 'bottom-left':
      return [width / 2, (-1 * height) / 2];
    case 'bottom-right':
      return [(-1 * width) / 2, (-1 * height) / 2];
  }
}

/**
 * Manages positioning of a static map image and marker relative to
 * pixel and geographical coordinates. Handles pointer events for
 * interactive/adjustable instances.
 */
export class MarkerController {
  imgContainerElement: HTMLElement;
  imgElement: HTMLImageElement;
  markerElement: HTMLElement;
  keepMarkerCentered: boolean;
  zoom: number;

  /** X-offset for the marker element to account for its positioning anchor */
  anchorOffsetX: number;
  /** Y-offset for the marker element to account for its positioning anchor */
  anchorOffsetY: number;

  /** Current X pixel of the pointer on the page */
  curPointerXPos: number;
  /** Current Y pixel of the pointer on the page */
  curPointerYPos: number;
  /** X-pixels deviation of marker position from the current map/feature center point */
  markerDeltaX: number;
  /** Y-pixels deviation of marker position from the current map/feature center point */
  markerDeltaY: number;

  /**
   * Lng/lat of feature coordinate and initial image center represented as screen pixels.
   * Value is fixed for a given original coordinate.
   */
  imgCenterPx: [number, number];
  /**
   * Lng/lat of adjusted image center as screen pixels.
   * Value changes as the image is panned around in its container.
   */
  imgCenterAdjustedPx: [number, number];

  /**
   *
   * @param imageContainer - The parent element of the <img>
   * @param imageContainer - The <img> element
   * @param marker - SVG Element used as the map marker
   * @param keepMarkerCentered - If true, the marker will stay centered within the frame while the map moves behind it
   * @param zoom - The zoom level of the static map, used to calculate between screen pixel and lng/lat
   * @param anchor - The part of the marker that should be positioned closest to the coordinate
   */
  constructor(
    imageContainer: HTMLElement,
    imageElement: HTMLImageElement,
    marker: HTMLElement,
    keepMarkerCentered: boolean,
    zoom: number,
    anchor: Anchor
  ) {
    this.markerElement = marker;
    this.imgContainerElement = imageContainer;
    this.imgElement = imageElement;
    this.keepMarkerCentered = keepMarkerCentered;
    this.zoom = zoom;
    this.anchor = anchor;

    this.curPointerXPos = 0;
    this.curPointerYPos = 0;
    this.markerDeltaX = 0;
    this.markerDeltaY = 0;

    this.imgContainerElement.addEventListener(
      'pointerdown',
      this.#onPointerDownImage
    );

    if (!this.keepMarkerCentered) {
      this.markerElement.addEventListener(
        'pointerdown',
        this.#onPointerDownMarker
      );
    }

    // Listen for changes to anchor size
    const resizeObserver = new ResizeObserver(this.#handleAnchorResize);
    resizeObserver.observe(this.markerElement);
  }

  #anchor: Anchor;

  get anchor(): Anchor {
    return this.#anchor;
  }

  set anchor(newAnchor: Anchor) {
    this.#anchor = newAnchor;
    [this.anchorOffsetX, this.anchorOffsetY] = getAnchorOffset(
      this.markerElement,
      newAnchor
    );
    this.markerTransform = {
      anchorX: this.anchorOffsetX,
      anchorY: this.anchorOffsetY
    };
  }

  #handleAnchorResize = (): void => {
    [this.anchorOffsetX, this.anchorOffsetY] = getAnchorOffset(
      this.markerElement,
      this.anchor
    );
    this.markerTransform = {
      anchorX: this.anchorOffsetX,
      anchorY: this.anchorOffsetY
    };
  };

  #markerTransform: MarkerTransform = {
    anchorX: 0,
    anchorY: 0,
    globalX: 0,
    globalY: 0,
    correctionX: 0,
    correctionY: 0
  };

  get markerTransform(): MarkerTransform {
    return this.#markerTransform;
  }

  set markerTransform(val: Partial<MarkerTransform>) {
    this.#markerTransform = {
      ...this.#markerTransform,
      ...val
    };
    this.#updateMarkerTransform();
  }

  #isActive = false;

  /** True if the marker is currently in edit mode */
  get isActive(): boolean {
    return this.#isActive;
  }

  /** Set to true to enable editing of the marker */
  set isActive(val: boolean) {
    this.imgContainerElement.style.touchAction = val ? 'none' : '';
    this.#isActive = val;
  }

  #originalCoordinate: [number, number];

  /** Lng/lat of the current marker location */
  get coordinate(): [number, number] {
    const adjustedPx: [number, number] = this.keepMarkerCentered
      ? this.imgCenterAdjustedPx
      : [
          this.imgCenterPx[0] - this.markerDeltaX,
          this.imgCenterPx[1] + this.markerDeltaY
        ];

    // If the screen pixel hasn't changed, use the original coordinate so as not to incur any precision rounding during translation
    if (deepEquals(adjustedPx, this.imgCenterPx)) {
      return this.#originalCoordinate;
    } else {
      const lngLat = merc.ll(adjustedPx, this.zoom);
      return [round(lngLat[0], 6), round(lngLat[1], 6)];
    }
  }

  /** Set the lng/lat corresponding to the initial marker and image center location */
  set coordinate(lngLat: [number, number]) {
    this.#originalCoordinate = lngLat;
    this.imgCenterPx = this.imgCenterAdjustedPx = merc.px(lngLat, this.zoom);
  }

  // Marker dragging event handlers
  #onPointerDownMarker = (m: PointerEvent): void => {
    if (!this.isActive) return;

    m.preventDefault();
    m.stopPropagation();

    this.#updatePointerPosition(m);

    window.addEventListener('pointermove', this.#onPointerMoveMarker);
    window.addEventListener('pointerup', this.#onPointerUpMarker);
  };

  #onPointerUpMarker = (): void => {
    window.removeEventListener('pointermove', this.#onPointerMoveMarker);
    window.removeEventListener('pointerup', this.#onPointerUpMarker);
  };

  #onPointerMoveMarker = (m: PointerEvent): void => {
    m.preventDefault();
    m.stopPropagation();

    // Calculate change in pointer position
    const diffX = this.curPointerXPos - m.pageX;
    const diffY = this.curPointerYPos - m.pageY;

    // Update relative marker positioning
    this.markerDeltaX += diffX;
    this.markerDeltaY -= diffY;
    // Clamp to image bounds
    this.markerDeltaX = Math.max(
      Math.min(this.imgElement.width / 2, this.markerDeltaX),
      (this.imgElement.width / 2) * -1
    );
    this.markerDeltaY = Math.max(
      Math.min(this.imgElement.height / 2, this.markerDeltaY),
      (this.imgElement.height / 2) * -1
    );

    // Calculate X/Y transforms
    const imageOffsetX = this.imgCenterPx[0] - this.imgCenterAdjustedPx[0];
    const imageOffsetY = this.imgCenterPx[1] - this.imgCenterAdjustedPx[1];
    const deltaX = this.markerDeltaX - imageOffsetX;
    const deltaY = this.markerDeltaY + imageOffsetY;

    this.markerTransform = { globalX: deltaX, globalY: deltaY };

    // Update pointer position
    this.#updatePointerPosition(m);
  };

  // Image dragging event handlers
  #onPointerDownImage = (m: PointerEvent): void => {
    if (!this.isActive) return;

    m.preventDefault();
    m.stopPropagation();

    this.#updatePointerPosition(m);

    window.addEventListener('pointermove', this.#onPointerMoveImage);
    window.addEventListener('pointerup', this.#onPointerUpImage);
  };

  #onPointerUpImage = (): void => {
    window.removeEventListener('pointermove', this.#onPointerMoveImage);
    window.removeEventListener('pointerup', this.#onPointerUpImage);
  };

  #onPointerMoveImage = (m: PointerEvent): void => {
    m.preventDefault();

    // Calculate and constrain updated scroll position
    let top = Math.round(
      this.imgContainerElement.scrollTop + (this.curPointerYPos - m.pageY)
    );
    // Clamp to container bounds
    top = Math.max(
      Math.min(
        this.imgElement.height - this.imgContainerElement.clientHeight,
        top
      ),
      0
    );
    let left = Math.round(
      this.imgContainerElement.scrollLeft + (this.curPointerXPos - m.pageX)
    );
    // Clamp to container bounds
    left = Math.max(
      Math.min(
        this.imgElement.width - this.imgContainerElement.clientWidth,
        left
      ),
      0
    );
    this.imgContainerElement.scrollTop = top;
    this.imgContainerElement.scrollLeft = left;

    // Update adjusted center location
    const diffX = Math.round(
      left - (this.imgElement.width - this.imgContainerElement.clientWidth) / 2
    );
    const diffY = Math.round(
      (this.imgElement.height - this.imgContainerElement.clientHeight) / 2 - top
    );
    this.imgCenterAdjustedPx = [
      this.imgCenterPx[0] + diffX,
      this.imgCenterPx[1] - diffY
    ];

    if (!this.keepMarkerCentered) {
      // Move marker in sync with image to maintain visual positioning on map
      const deltaX = this.markerDeltaX + diffX;
      const deltaY = this.markerDeltaY + diffY;
      this.markerTransform = { globalX: deltaX, globalY: deltaY };
    }

    this.#updateMarkerCorrection(left, top);

    // Update pointer position
    this.#updatePointerPosition(m);
  };

  #updatePointerPosition = (m: PointerEvent): void => {
    this.curPointerXPos = m.pageX;
    this.curPointerYPos = m.pageY;
  };

  #updateMarkerTransform = (): void => {
    const { anchorX, anchorY, globalX, globalY, correctionX, correctionY } =
      this.#markerTransform;
    const transformX = anchorX - globalX + correctionX;
    const transformY = anchorY + globalY + correctionY;
    this.markerElement.style.transform = `translate(calc(-50% + ${transformX}px), calc(-50% + ${transformY}px))`;
  };

  /** Re-center the marker on the map at its original location */
  reCenter = (): void => {
    // Set scroll values to center image in its container
    const top =
      (this.imgElement.height - this.imgContainerElement.clientHeight) / 2;
    const left =
      (this.imgElement.width - this.imgContainerElement.clientWidth) / 2;
    this.imgContainerElement.scrollTop = top;
    this.imgContainerElement.scrollLeft = left;

    // Reset adjusted image center screen coordinate to match original
    this.imgCenterAdjustedPx = this.imgCenterPx;

    // Reset marker transform in case it was changed
    this.markerDeltaX = this.markerDeltaY = 0;
    this.markerTransform = {
      globalX: 0,
      globalY: 0,
      correctionX: 0,
      correctionY: 0
    };
  };

  /**
   * The x/y offset of the image from its center based on its scrolled position within its container.
   */
  get imgCenterOffset(): { x: number; y: number } {
    return {
      x: this.imgCenterPx[0] - this.imgCenterAdjustedPx[0],
      y: this.imgCenterPx[1] - this.imgCenterAdjustedPx[1]
    };
  }

  /** Update image scroll position when the Minimap has been resized */
  handleMinimapResize = (): void => {
    if (!this.imgElement.height || !this.imgElement.width) return;

    const centerOffsetX = this.imgCenterOffset.x;
    const centerOffsetY = this.imgCenterOffset.y;

    const left =
      this.imgElement.width / 2 -
      centerOffsetX -
      this.imgContainerElement.clientWidth / 2;
    const top =
      this.imgElement.height / 2 -
      centerOffsetY -
      this.imgContainerElement.clientHeight / 2;

    this.imgContainerElement.scrollLeft = left;
    this.imgContainerElement.scrollTop = top;

    this.#updateMarkerCorrection(left, top);
  };

  /**
   * Update marker X/Y transform corrections based on image scroll position
   * @param scrollLeft - scrollLeft of image container
   * @param scrollTop - scrollTop of image container
   */
  #updateMarkerCorrection = (scrollLeft: number, scrollTop: number): void => {
    const centerOffsetX = this.imgCenterOffset.x;
    const centerOffsetY = this.imgCenterOffset.y;

    const { correctionX, correctionY } = this.markerTransform;

    const corrections: Partial<MarkerTransform> = {};

    // Update marker x-transform correction
    if (scrollLeft / 2 < centerOffsetX * -1) {
      const markerTranslateX = centerOffsetX * -1 - scrollLeft / 2;
      corrections.correctionX = markerTranslateX * 2;
    } else if (scrollLeft < 0) {
      corrections.correctionX = scrollLeft;
    } else if (correctionX !== 0) {
      corrections.correctionX = 0;
    }

    // Update marker y-transform correction
    if (scrollTop / 2 < centerOffsetY * -1) {
      const markerTranslateY = centerOffsetY * -1 - scrollTop / 2;
      corrections.correctionY = markerTranslateY * 2;
    } else if (scrollTop < 0) {
      corrections.correctionY = scrollTop;
    } else if (correctionY !== 0) {
      corrections.correctionY = 0;
    }

    this.markerTransform = corrections;
  };
}
