/**
 * A `LngLat` object represents a given longitude and latitude coordinate, measured in degrees.
 * These coordinates use longitude, latitude coordinate order (as opposed to latitude, longitude)
 * to match the [GeoJSON specification](https://datatracker.ietf.org/doc/html/rfc7946#section-4),
 * which is equivalent to the OGC:CRS84 coordinate reference system.
 *
 * Note that any method that accepts a `LngLat` object as an argument or option
 * can also accept an `Array` of two numbers and will perform an implicit conversion.
 * This flexible type is documented as {@link LngLatLike}.
 *
 * @class LngLat
 * @param lng - Longitude, measured in degrees.
 * @param lat - Latitude, measured in degrees.
 * @example
 * ```typescript
 * const ll = new LngLat(-123.9749, 40.7736);
 * console.log(ll.lng); // = -123.9749
 * ```
 */
export class LngLat {
  /**
   * @name lng
   * @instance
   * @memberof LngLat
   */
  readonly lng: number;
  /**
   * @name lat
   * @instance
   * @memberof LngLat
   */
  readonly lat: number;

  constructor(lng: number, lat: number) {
    if (isNaN(lng) || isNaN(lat)) {
      throw new Error(`Invalid LngLat object: (${lng}, ${lat})`);
    }
    this.lng = +lng;
    this.lat = +lat;
    if (this.lat > 90 || this.lat < -90) {
      throw new Error(
        'Invalid LngLat latitude value: must be between -90 and 90'
      );
    }
    if (this.lng > 180 || this.lng < -180) {
      throw new Error(
        'Invalid LngLat longitude value: must be between -180 and 180'
      );
    }
  }

  /**
   * Returns the coordinates represented as an array of two numbers.
   *
   * @returns The coordinates represeted as an array of longitude and latitude.
   * @example
   * ```typescript
   * const ll = new LngLat(-73.9749, 40.7736);
   * ll.toArray(); // = [-73.9749, 40.7736]
   * ```
   */
  toArray(): [number, number] {
    return [this.lng, this.lat];
  }

  /**
   * Returns the coordinates represent as a string.
   *
   * @returns The coordinates represented as a string of the format `'LngLat(lng, lat)'`.
   * @example
   * ```typescript
   * const ll = new LngLat(-73.9749, 40.7736);
   * ll.toString(); // = "LngLat(-73.9749, 40.7736)"
   * ```
   */
  toString(): string {
    return `LngLat(${this.lng}, ${this.lat})`;
  }

  /**
   * Converts an array of two numbers or an object with `lng` and `lat` or `lon` and `lat` properties
   * to a `LngLat` object.
   *
   * If a `LngLat` object is passed in, the function returns a copy.
   *
   * @param input - An array of two numbers or object to convert, or a `LngLat` object to return.
   * @returns A new `LngLat` object, if a conversion occurred, or the original `LngLat` object.
   * @example
   * ```typescript
   * const arr = [-73.9749, 40.7736];
   * const ll = LngLat.convert(arr);
   * console.log(ll);   // = LngLat {lng: -73.9749, lat: 40.7736}
   * ```
   */
  static convert(
    input:
      | LngLat
      | { lng: number; lat: number }
      | { lon: number; lat: number }
      | [number, number]
  ): LngLat {
    // Make a copy if already an LngLat.
    if (input instanceof LngLat) {
      return new LngLat(input.lng, input.lat);
    }

    if (Array.isArray(input) && input.length === 2) {
      return new LngLat(Number(input[0]), Number(input[1]));
    }

    if (
      !Array.isArray(input) &&
      typeof input == 'object' &&
      input !== null &&
      ('lng' in input || 'lon' in input) &&
      'lat' in input
    ) {
      return new LngLat(
        Number('lng' in input ? input.lng : input.lon),
        Number(input.lat)
      );
    }

    throw new Error(
      '`LngLatLike` argument must be specified as an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]'
    );
  }
}

/**
 * A {@link LngLat} object, an array of two numbers representing longitude and latitude,
 * or an object with `lng` and `lat` or `lon` and `lat` properties.
 *
 * @typedef LngLatLike
 * @type {LngLat | [number, number] | { lng: number, lat: number } | { lon: number, lat: number }}
 * @example
 * ```typescript
 * const v1 = new LngLat(-122.420679, 37.772537);
 * const v2 = [-122.420679, 37.772537];
 * const v3 = {lon: -122.420679, lat: 37.772537};
 * ```
 */
export type LngLatLike =
  | LngLat
  | { lng: number; lat: number }
  | { lon: number; lat: number }
  | [number, number];
