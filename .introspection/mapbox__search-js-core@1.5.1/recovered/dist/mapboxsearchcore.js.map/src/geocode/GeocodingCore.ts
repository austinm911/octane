import { getFetch } from '../fetch';
import { LngLat, LngLatLike } from '../LngLat';
import { LngLatBounds, LngLatBoundsLike } from '../LngLatBounds';
import { handleNonOkRes } from '../MapboxError';
import { SessionToken, SessionTokenLike } from '../SessionToken';
import { queryParams } from '../utils/queryParams';
import { FORWARD_URL, REVERSE_URL } from './constants';
import { FeatureTypes, GeocodingFeature } from './types';
import { COORDINATE_QUERY_REGEX, SPACES_OR_COMMA_REGEX } from '../constants';

interface AccessTokenOptions {
  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   */
  accessToken: string;
}

interface FetchOptions {
  /**
   * If specified, the connected {@link AbortController} can be used to
   * abort the current network request(s).
   *
   * This mechanism intentionally works in the same way as the
   * [`fetch` API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#aborting_a_fetch).
   *
   * Reference:
   * https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal#examples
   */
  signal?: AbortSignal;
}

/**
 * Options object to configure a {@link GeocodingCore} instance that is driven by a web component.
 * @typedef ComponentOptions
 */
interface ComponentOptions {
  /**
   * If true, the coordinates in the query string are expected to be (lat,lng) instead of (lng,lat).
   */
  flipCoordinates?: boolean;
}

interface SessionTokenOptions {
  /**
   * A customer-provided session token value, which groups a series of requests together for [billing purposes](https://www.mapbox.com/pricing#autofill-session).
   *
   * Reference:
   * https://www.mapbox.com/pricing#autofill-session
   */
  sessionToken: SessionTokenLike;
}

interface GeocodingQueryOptions {
  /**
   * (Forward queries only) The user's query string. The query is limited to 256 characters.
   */
  q: string;
  /**
   * (Reverse queries only) The longitude component of a coordinate, in decimal degrees.
   */
  longitude: string | number;
  /**
   * (Reverse queries only) The latitude component of a coordinate, in decimal degrees.
   */
  latitude: string | number;
}

/**
 * Options object for configuring {@link GeocodingCore}, mapped to {@link https://docs.mapbox.com/api/search/geocoding/|Geocoding API} parameters.
 * @typedef GeocodingOptions
 */
export interface GeocodingOptions {
  /**
   * When autocomplete is enabled, results will be included that start with the requested string, rather than just responses that match it exactly.
   *
   * Defaults to true.
   */
  autocomplete?: boolean;
  /**
   * Limit results to only those contained within the supplied bounding box.
   */
  bbox?: string | LngLatBoundsLike;
  /**
   * Limit results to one or more countries. Permitted values are [ISO 3166 alpha 2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country codes separated by commas.
   */
  country?: string;
  /**
   * An [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) that controls the language of the text supplied in responses, and also affects result scoring.
   */
  language?: string;
  /**
   * The number of results to return, up to `10`.
   *
   * Defaults to 5.
   */
  limit?: number;
  /**
   * Bias the response to favor results that are closer to this location.
   *
   * Provided as two comma-separated coordinates in longitude,latitude order, or the string `ip` to bias based on reverse IP lookup.
   */
  proximity?: string | LngLatLike;
  /**
   * Filter results to include only a subset (one or more) of the available feature types. Multiple options can be comma-separated.
   */
  types?: string | Set<FeatureTypes>;
  /**
   * Available worldviews are: `cn`, `in`, `jp`, `us`. If a worldview is not set, `us` worldview boundaries will be returned.
   */
  worldview?: string;
  /**
   * Permanent geocodes are used for use cases that require storing
   * data indefinitely. If 'true', requests will be made with permanent enabled.
   * Separate billing for permanent geocoding will apply.
   *
   * If undefined or 'false', the geocoder will default to use temporary geocoding.
   * Temporary geocoding results are not allowed to be cached.
   *
   * For questions related to permanent resource usage and billing, contact
   * [Mapbox sales](https://www.mapbox.com/contact/sales/).
   */
  permanent?: boolean;
}

/**
 * A `GeocodingResponse` object represents a returned data object from the [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding-v6/#geocoding-response-object).
 *
 * @typedef GeocodingResponse
 */
export interface GeocodingResponse {
  /**
   * `"FeatureCollection"`, a GeoJSON type from the [GeoJSON specification](https://tools.ietf.org/html/rfc7946).
   */
  type: 'FeatureCollection';
  /**
   * The returned feature objects.
   *
   * @see {@link GeocodingFeature}
   */
  features: GeocodingFeature[];
  /**
   * Attributes the results of the Mapbox Geocoding API to Mapbox.
   */
  attribution: string;
  url?: string;
}

/**
 * A `GeocodingCore` object is an application's main entrypoint to the [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding-v6/).
 * The Geocoding API allows forward (location to coordinates) and reverse (coordinates to location) queries, enabled by corresponding
 * methods from the `GeocodingCore` object.
 *
 * A [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) is required to use `GeocodingCore`, and
 * other options may be specified either in the constructor or in the {@link GeocodingCore#forward} or {@link GeocodingCore#reverse} calls.
 *
 * @class GeocodingCore
 * @param {GeocodingOptions} [options]
 * @param {string} [options.accessToken]
 *
 * @example
 * ```typescript
 * const geocode = new GeocodingCore({ accessToken: 'pk.my-mapbox-access-token' });
 *
 * const results = await geocode.forward('Washington D.C.');
 * if (results.features.length === 0) return;
 *
 * const feature = results.features[0];
 * doSomethingWithCoordinates(feature);
 * ```
 */
export class GeocodingCore {
  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   */
  accessToken: string;

  /**
   * Any default options ({@link GeocodingOptions}) to be merged into options in the following methods:
   * - {@link GeocodingCore#forward}
   * - {@link GeocodingCore#reverse}
   */
  defaults: Partial<GeocodingOptions>;

  #responseHeaders: Headers;
  get responseHeaders(): Headers {
    return this.#responseHeaders;
  }

  constructor(options: Partial<AccessTokenOptions & GeocodingOptions> = {}) {
    const { accessToken, ...defaults } = options;

    this.accessToken = accessToken;

    // Assign defaults to this.defaults.
    this.defaults = {
      ...defaults
    };
  }

  /** @section {Programmatic search} */

  /**
   * {@link GeocodingCore#forward} allows you to look up a feature by name
   * and returns the feature(s) and corresponding geographic coordinates in [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) format.
   *
   * **Legal terms:**
   *
   * Due to legal terms from our data sources, geographic coordinates should be used ephemerally and not persisted.
   * If the results are to be cached/stored in a customer database,
   * calls to {@link GeocodingCore#forward} should specify `permanent: true` within the method options argument.
   *
   * This permanent policy is consistent with the [Mapbox Terms of Service](https://www.mapbox.com/tos/) and failure to comply
   * may result in modified or discontinued service.
   *
   * Additionally, the [Mapbox Terms of Service](https://www.mapbox.com/tos/) states any rendering of a feature suggestion
   * must be using Mapbox map services (for example, displaying results on Google Maps or MapKit JS is not allowed).
   *
   * **Disclaimer:**
   *
   * The failure of Mapbox to exercise or enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
   *
   * @param {String} searchText
   * @param {GeocodingOptions} [optionsArg]
   * @param {AbortSignal} [optionsArg.signal]
   *
   * @example
   * ```typescript
   * const results = await geocode.forward('Washington D.C.');
   * if (results.features.length === 0) return;
   *
   * const feature = results.features[0];
   * doSomethingWithCoordinates(feature);
   * ```
   */
  async forward(
    searchText: string, // TODO: enable structured input alternative arguments (e.g. `searchText: string | StructuredInput`)
    optionsArg?: Partial<FetchOptions & GeocodingOptions & SessionTokenOptions>
  ): Promise<GeocodingResponse> {
    if (!searchText) {
      throw new Error('searchText is required');
    }

    let signal: AbortSignal;
    if (optionsArg) {
      ({ signal } = optionsArg);
    }

    const options = {
      ...this.defaults,
      ...optionsArg,
      q: searchText
    };

    const url = new URL(`${FORWARD_URL}`);
    url.search = this.#getQueryParams(options);

    const { fetch } = getFetch();
    const fetchInit = signal ? { signal } : {};
    const res = await fetch(url.toString(), fetchInit);

    this.#responseHeaders = res.headers;

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as GeocodingResponse;

    // Augment the response with SDK-specific properties.
    json.url = url.toString();
    json.features?.forEach((feature) => {
      feature._source = 'mapbox';
    });

    return json;
  }

  /**
   * {@link GeocodingCore#reverse} allows you to look up a single pair of coordinates and returns the
   * geographic feature or features that exist at that location in [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) format.
   *
   * **Legal terms:**
   *
   * Due to legal terms from our data sources, geographic coordinates should be used ephemerally and not persisted.
   * If the results are to be cached/stored in a customer database,
   * calls to {@link GeocodingCore#reverse} should specify `permanent: true` within the method options argument.
   *
   * This permanent policy is consistent with the [Mapbox Terms of Service](https://www.mapbox.com/tos/) and failure to comply
   * may result in modified or discontinued service.
   *
   * Additionally, the [Mapbox Terms of Service](https://www.mapbox.com/tos/) states any rendering of a feature suggestion
   * must be using Mapbox map services (for example, displaying results on Google Maps or MapKit JS is not allowed).
   *
   * **Disclaimer:**
   *
   * The failure of Mapbox to exercise or enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
   *
   * @param {String | LngLatLike} lngLat
   * @param {GeocodingOptions} [optionsArg]
   * @param {AbortSignal} [optionsArg.signal]
   *
   * @example
   * ```typescript
   * const results = await geocode.reverse({ lat: 40.7736, lng: -73.9749 });
   * if (results.features.length === 0) return;
   *
   * const feature = results.features[0];
   * doSomethingWithFeature(feature);
   * ```
   */
  async reverse(
    lngLat: string | LngLatLike,
    optionsArg?: Partial<FetchOptions & GeocodingOptions & SessionTokenOptions>
  ): Promise<GeocodingResponse> {
    if (!lngLat) {
      throw new Error('lngLat is required');
    }

    let signal: AbortSignal;
    if (optionsArg) {
      ({ signal } = optionsArg);
    }

    let lngLatObj: LngLat;
    if (typeof lngLat === 'string') {
      const [lng, lat] = lngLat.split(',');
      lngLatObj = new LngLat(Number(lng), Number(lat));
    } else {
      lngLatObj = LngLat.convert(lngLat);
    }

    const options = {
      ...this.defaults,
      ...optionsArg,
      longitude: lngLatObj.lng,
      latitude: lngLatObj.lat
    };

    const url = new URL(`${REVERSE_URL}`);
    url.search = this.#getQueryParams(options, true);

    const { fetch } = getFetch();
    const fetchInit = signal ? { signal } : {};
    const res = await fetch(url.toString(), fetchInit);

    this.#responseHeaders = res.headers;

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as GeocodingResponse;

    // Augment the response with SDK-specific properties.
    json.url = url.toString();
    json.features?.forEach((feature) => {
      feature._source = 'mapbox';
    });

    return json;
  }

  /** @section {Interactive search} */

  /**
   * {@link GeocodingCore#suggest} is a managed endpoint for an interactive {@link SearchSession}, such as one operated
   * through a web or React component. It accepts a search text string for either a {@link GeocodingCore#forward} or
   * {@link GeocodingCore#reverse} geocoding query and returns a {@link GeocodingResponse} object.
   *
   * @param {String} searchText
   * @param {GeocodingOptions} [optionsArg]
   * @param {AbortSignal} [optionsArg.signal]
   *
   * @example
   * ```typescript
   * const result = await geocode.suggest('123 Main St');
   * if (results.features.length === 0) return;
   *
   * const feature = results.features[0];
   * doSomethingWithCoordinates(feature);
   * ```
   */
  async suggest(
    searchText: string,
    optionsArg?: Partial<
      FetchOptions & GeocodingOptions & SessionTokenOptions & ComponentOptions
    >
  ): Promise<GeocodingResponse> {
    const isReverseQuery = COORDINATE_QUERY_REGEX.test(searchText);
    if (isReverseQuery) {
      let coordinates = searchText
        .trim()
        .split(SPACES_OR_COMMA_REGEX)
        .map((part) => part.trim());
      if (optionsArg.flipCoordinates) {
        coordinates = coordinates.reverse();
      }
      const coordinatesString = coordinates.join(',');
      return this.reverse(coordinatesString, optionsArg);
    } else {
      return this.forward(searchText, optionsArg);
    }
  }

  /**
   * {@link GeocodingCore#retrieve} is a managed endpoint for an interactive {@link SearchSession}, such as one operated
   * through a web or React component. It accepts a {@link GeocodingFeature} object and returns the same object. It is used
   * in a SearchSession to respond to a user's selection of a feature suggestion. Unlike the Search Box API, the Geocoding API
   * returns all feature data in the initial response, so this method does not perform any further data retrieval.
   *
   * @param {GeocodingFeature} suggestion
   */
  async retrieve(suggestion: GeocodingFeature): Promise<GeocodingFeature> {
    return suggestion;
  }

  /**
   * Returns the query parameters used by {@link <GeocodingCore>#forward} and {@link <GeocodingCore>#reverse}
   */
  #getQueryParams(
    options: Partial<
      GeocodingOptions & GeocodingQueryOptions & SessionTokenOptions
    >,
    isReverse = false
  ): string {
    // Remove query parameters that don't apply to forward or reverse
    if (isReverse) {
      ['proximity', 'autocomplete', 'bbox'].forEach((key) => {
        if (key in options) {
          delete options[key];
        }
      });
    }
    return queryParams(
      {
        q: options.q,
        longitude: options.longitude,
        latitude: options.latitude,
        access_token: this.accessToken,
        permanent: options.permanent,
        language: options.language,
        country: options.country,
        limit: options.limit,
        autocomplete: options.autocomplete,
        worldview: options.worldview
      },
      options.sessionToken && {
        session_token: SessionToken.convert(options.sessionToken).id
      },
      options.proximity && {
        proximity:
          typeof options.proximity === 'string'
            ? options.proximity
            : LngLat.convert(options.proximity).toArray().join(',')
      },
      options.bbox && {
        bbox:
          typeof options.bbox === 'string'
            ? options.bbox
            : LngLatBounds.convert(options.bbox).toFlatArray().join(',')
      },
      options.types && {
        types:
          typeof options.types === 'string'
            ? options.types
            : [...options.types].join(',')
      }
    );
  }
}
