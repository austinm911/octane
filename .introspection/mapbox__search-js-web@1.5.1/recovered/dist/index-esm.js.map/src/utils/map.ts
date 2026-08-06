import mapboxgl from 'mapbox-gl';

/**
 * This is slightly higher than the default value of 1.2.
 * https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto
 * We use a high speed value for cypress tests to increase test speed and improve test stability.
 */
export const FLY_TO_SPEED = 1.4;

/**
 * Gets the center/zoom for a given bounding box.
 *
 * @param delta - Subtracted from the zoom level so users can fully see
 * the bounding box. This is a hack to add padding.
 */
export function bboxViewport(
  map: mapboxgl.Map,
  bounds: mapboxgl.LngLatBoundsLike,
  delta = 0.5
): mapboxgl.FlyToOptions {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { center, zoom } = map.cameraForBounds(bounds)!;
  const transformedZoom = Math.max(zoom - delta, 0);

  return {
    center,
    zoom: transformedZoom,
    speed: FLY_TO_SPEED
  };
}

/**
 * Gets the maximum zoom level for a [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/)
 * or [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding-v6/) place type.
 *
 * @returns The maximum zoom level for the given place type, `16` if the type is not supported.
 */
export function getMaxZoom(placeType: string): number {
  switch (placeType) {
    case 'street':
      return 15;
    case 'neighborhood':
    case 'postcode':
    case 'locality':
    case 'oaza':
      return 14;
    case 'place':
    case 'city':
      return 13;
    case 'district':
      return 9;
    case 'region':
    case 'prefecture':
      return 6;
    case 'country':
      return 4;
    default:
      return 16;
  }
}

/**
 * Gets the base URL for the Static Images API for a given user style
 * {@link https://docs.mapbox.com/api/maps/static-images/}
 * @param username The username of the account to which the style belongs
 * @param styleId The ID of the style from which to create a static map
 * @returns
 */
export function getStaticBaseUrl(username: string, styleId: string): string {
  return `https://api.mapbox.com/styles/v1/${username}/${styleId}/static/`;
}
