import { LngLat, LngLatLike } from './LngLat';

/**
 * A `LngLatBounds` object represents a geographical bounding box,
 * defined by its southwest and northeast points in longitude and latitude.
 *
 * Note that any method that accepts a `LngLatBounds` object as an argument or option
 * can also accept an `Array` of two {@link LngLatLike} constructs and will perform an implicit conversion.
 * This flexible type is documented as {@link LngLatBoundsLike}.
 *
 * @class LngLatBounds
 */
export class LngLatBounds {
  private _ne: LngLat;
  private _sw: LngLat;

  /**
   * @param sw - The southwest corner of the bounding box.
   * @param ne - The northeast corner of the bounding box.
   * @example
   * ```typescript
   * const sw = new LngLat(-73.9876, 40.7661);
   * const ne = new LngLat(-73.9397, 40.8002);
   * const llb = new LngLatBounds(sw, ne);
   * ```
   */
  constructor(sw: LngLatLike, ne: LngLatLike) {
    this._sw = LngLat.convert(sw);
    this._ne = LngLat.convert(ne);
  }

  /**
   * Returns the southwest corner of the bounding box.
   *
   * @returns The southwest corner of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getSouthWest(); // LngLat {lng: -73.9876, lat: 40.7661}
   * ```
   */
  getSouthWest(): LngLat {
    return this._sw;
  }

  /**
   * Returns the northeast corner of the bounding box.
   *
   * @returns The northeast corner of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getNorthEast(); // LngLat {lng: -73.9397, lat: 40.8002}
   * ```
   */
  getNorthEast(): LngLat {
    return this._ne;
  }

  /**
   * Returns the northwest corner of the bounding box. This is commonly used
   * as the 'min' point in the bounding box.
   *
   * @returns The northwest corner of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getNorthWest(); // LngLat {lng: -73.9876, lat: 40.8002}
   * ```
   */
  getNorthWest(): LngLat {
    return new LngLat(this.getWest(), this.getNorth());
  }

  /**
   * Returns the southeast corner of the bounding box. This is commonly used
   * as the 'max' point in the bounding box.
   *
   * @returns The southeast corner of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getSouthEast(); // LngLat {lng: -73.9397, lat: 40.7661}
   * ```
   */
  getSouthEast(): LngLat {
    return new LngLat(this.getEast(), this.getSouth());
  }

  /**
   * Returns the west edge of the bounding box.
   *
   * @returns The west edge of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getWest(); // -73.9876
   * ```
   */
  getWest(): number {
    return this._sw.lng;
  }

  /**
   * Returns the south edge of the bounding box.
   *
   * @returns The south edge of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getSouth(); // 40.7661
   * ```
   */
  getSouth(): number {
    return this._sw.lat;
  }

  /**
   * Returns the east edge of the bounding box.
   *
   * @returns The east edge of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getEast(); // -73.9397
   * ```
   */
  getEast(): number {
    return this._ne.lng;
  }

  /**
   * Returns the north edge of the bounding box.
   *
   * @returns The north edge of the bounding box.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.getNorth(); // 40.8002
   * ```
   */
  getNorth(): number {
    return this._ne.lat;
  }

  /**
   * Returns the bounding box represented as an array.
   *
   * @returns The bounding box represented as an array, consisting of the
   *   southwest and northeast coordinates of the bounding represented as arrays of numbers.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.toArray(); // = [[-73.9876, 40.7661], [-73.9397, 40.8002]]
   * ```
   */
  toArray(): [[number, number], [number, number]] {
    return [this._sw.toArray(), this._ne.toArray()];
  }

  /**
   * Returns the bounding box represented as a flattened array.
   *
   * @returns The bounding box represented as an array of numbers in [west, south, east, north] order.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.toFlatArray(); // = [-73.9876, 40.7661, -73.9397, 40.8002]
   * ```
   */
  toFlatArray(): [number, number, number, number] {
    return [this._sw.lng, this._sw.lat, this._ne.lng, this._ne.lat];
  }

  /**
   * Return the bounding box represented as a string.
   *
   * @returns The bounding box represents as a string of the format
   *   `'LngLatBounds(LngLat(lng, lat), LngLat(lng, lat))'`.
   * @example
   * ```typescript
   * const llb = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
   * llb.toString(); // = "LngLatBounds(LngLat(-73.9876, 40.7661), LngLat(-73.9397, 40.8002))"
   * ```
   */
  toString(): string {
    return `LngLatBounds(${this._sw.toString()}, ${this._ne.toString()})`;
  }

  /**
   * Converts an array to a `LngLatBounds` object.
   *
   * If a `LngLatBounds` object is passed in, the function returns a copy.
   *
   * Internally, the function calls `LngLat#convert` to convert arrays to `LngLat` values.
   *
   * @param input - An array of two coordinates to convert, or a `LngLatBounds` object to return.
   * @returns A new `LngLatBounds` object, if a conversion occurred, or the original `LngLatBounds` object.
   * @example
   * ```typescript
   * const arr = [[-73.9876, 40.7661], [-73.9397, 40.8002]];
   * const llb = LngLatBounds.convert(arr);
   * console.log(llb);   // = LngLatBounds {_sw: LngLat {lng: -73.9876, lat: 40.7661}, _ne: LngLat {lng: -73.9397, lat: 40.8002}}
   * ```
   */
  static convert(
    input:
      | LngLatBounds
      | [LngLatLike, LngLatLike]
      | [number, number, number, number]
  ): LngLatBounds {
    if (!input) {
      throw new Error('Invalid LngLatBounds convert value: falsy');
    }

    // Make a copy if already an LngLatBounds.
    if (input instanceof LngLatBounds) {
      return new LngLatBounds(input.getSouthWest(), input.getNorthEast());
    }

    if (Array.isArray(input) && input.length === 2) {
      return new LngLatBounds(
        LngLat.convert(input[0]),
        LngLat.convert(input[1])
      );
    }

    if (Array.isArray(input) && input.length === 4) {
      return new LngLatBounds(
        LngLat.convert([input[0], input[1]]),
        LngLat.convert([input[2], input[3]])
      );
    }

    throw new Error(
      '`LngLatBoundsLike` argument must be specified as an array [<LngLatLike>, <LngLatLike>] or an array [<west>, <south>, <east>, <north>]'
    );
  }
}

/**
 * A {@link LngLatBounds} object, an array of {@link LngLatLike} objects in [sw, ne] order,
 * or an array of numbers in [west, south, east, north] order.
 *
 * @typedef LngLatBoundsLike
 * @type {LngLatBounds | [LngLatLike, LngLatLike] | [number, number, number, number]}
 * @example
 * ```typescript
 * const v1 = new LngLatBounds(
 *   new LngLat(-73.9876, 40.7661),
 *   new LngLat(-73.9397, 40.8002)
 * );
 * const v2 = new LngLatBounds([-73.9876, 40.7661], [-73.9397, 40.8002]);
 * const v3 = [[-73.9876, 40.7661], [-73.9397, 40.8002]];
 * ```
 */
export type LngLatBoundsLike =
  | LngLatBounds
  | [LngLatLike, LngLatLike]
  | [number, number, number, number];
