export const UNKNOWN_ERROR = 'Unknown error';

/**
 * Thrown from Search JS Core functions when a network request fails.
 *
 * See common errors here:
 * - [SearchBoxCore](https://docs.mapbox.com/api/search/search-box/#search-box-api-errors)
 * - [AddressAutofillCore](https://docs.mapbox.com/api/search/geocoding-v6/#geocoding-api-errors)
 */
export class MapboxError extends Error {
  readonly statusCode: number;

  constructor(json: Record<string, unknown>, statusCode: number) {
    super(String(json.message || json.error || UNKNOWN_ERROR));
    this.name = 'MapboxError';
    this.statusCode = statusCode;
  }

  /**
   * Modified Error toString() method to include the status code.
   */
  toString(): string {
    return `${this.name} (${this.statusCode}): ${this.message}`;
  }
}

/**
 * Utility function to see if the result is "ok" (in 200 range).
 *
 * If not, throw a {@link MapboxError} filled out by the
 * [JSON error format](https://docs.mapbox.com/api/search/search-box/#search-box-api-errors).
 */
export async function handleNonOkRes(res: Response): Promise<void> {
  if (!res.ok) {
    const json = await res.json();
    throw new MapboxError(json, res.status);
  }
}
