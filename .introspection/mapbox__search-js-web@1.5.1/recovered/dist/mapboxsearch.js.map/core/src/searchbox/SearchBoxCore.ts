import {
  CATEGORY_URL,
  RETRIEVE_URL,
  REVERSE_URL,
  SUGGEST_URL
} from './constants';
import {
  SearchBoxAdministrativeUnitTypes,
  SearchBoxSuggestion,
  SearchBoxFeatureSuggestion,
  SearchBoxCategorySuggestion,
  SearchBoxFeatureProperties
} from './types';

import { LngLat, LngLatLike } from '../LngLat';
import { LngLatBounds, LngLatBoundsLike } from '../LngLatBounds';
import { SessionToken, SessionTokenLike } from '../SessionToken';

import { handleNonOkRes } from '../MapboxError';
import { getFetch } from '../fetch';
import { queryParams } from '../utils/queryParams';
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
   * This mechanism works in the same way as the [`fetch` API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#aborting_a_fetch).
   *
   * Reference:
   * https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal#examples
   */
  signal?: AbortSignal;
}

/**
 * Options object to configure a {@link SearchBoxCore} instance that is driven by a web component.
 * @typedef ComponentOptions
 */
interface ComponentOptions {
  /**
   * Allow the user to query a coordinate string (e.g. "lng,lat") to get a reverse search result.
   */
  allowReverse?: boolean;
  /**
   * If true, the coordinates in the query string are expected to be (lat,lng) instead of (lng,lat).
   */
  flipCoordinates?: boolean;
}

interface SessionTokenOptions {
  /**
   * A customer-provided session token value, which groups a series of requests
   * together for [billing purposes](https://docs.mapbox.com/api/search/search-box/#search-box-api-pricing).
   *
   * Reference:
   * https://docs.mapbox.com/api/search/search-box/#search-box-api-pricing
   */
  sessionToken: SessionTokenLike;
}

interface SearchQueryOptions {
  /**
   * The user's query string. The query is limited to 256 characters.
   */
  q: string;
}

/**
 * Options object for configuring {@link SearchBoxCore}, mapped to {@link https://docs.mapbox.com/api/search/search-box/|Search Box API} parameters.
 * @typedef SearchBoxOptions
 */
export interface SearchBoxOptions {
  /**
   * The [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) to be returned.
   *
   * If not specified, `en` will be used.
   */
  language?: string;
  /**
   * The number of results to return, up to `10`.
   */
  limit?: string | number;
  /**
   * Bias the response to favor results that are closer to this location.
   *
   * When both {@link SearchBoxOptions#proximity} and {@link SearchBoxOptions#origin} are specified, `origin` is interpreted as the
   * target of a route, while `proximity` indicates the current user location.
   */
  proximity?: string | LngLatLike;
  /**
   * The location from which to calculate distance. **This parameter may incur additional latency.**
   *
   * When both {@link SearchBoxOptions#proximity} and {@link SearchBoxOptions#origin} are specified, `origin` is interpreted as the
   * target of a route, while `proximity` indicates the current user location.
   *
   * For distance calculations, both {@link SearchBoxOptions#navigation_profile} and
   * {@link SearchBoxOptions#origin} must be specified.
   *
   * For ETA calculations: {@link SearchBoxOptions#navigation_profile},
   * {@link SearchBoxOptions#origin}, and {@link SearchBoxOptions#eta_type} must be specified.
   */
  origin?: string | LngLatLike;
  /**
   * Limit results to only those contained within the supplied bounding box.
   */
  bbox?: string | LngLatBoundsLike;
  /**
   * The navigation routing profile to use for distance/eta calculations.
   *
   * For distance calculations, both {@link SearchBoxOptions#navigation_profile} and
   * {@link SearchBoxOptions#origin} must be specified.
   *
   * For ETA calculations: {@link SearchBoxOptions#navigation_profile},
   * {@link SearchBoxOptions#origin}, and {@link SearchBoxOptions#eta_type} must be specified.
   */
  navigation_profile?: 'driving' | 'walking' | 'cycling';
  /**
   * A polyline encoded linestring describing the route to be used for searching.
   *
   * Both polyline5 and polyline6 precision are accepted, but must be specified using the {@link SearchBoxOptions#route_geometry} parameter.
   */
  route?: string;
  /**
   * Passed in conjunction with a route polyline describing its precision. Options are polyline or polyline6. If this parameter is not provided with a {@link SearchBoxOptions#route}, the default is polyline.
   *
   * Accurate results depend on including the correct route_geometry for the {@link SearchBoxOptions#route} provided.
   */
  route_geometry?: string;
  /**
   * This indicates that the user intends to perform a higher cost search-along-route request.
   *
   * This should be included when {@link SearchBoxOptions#route} is included and should have a value of isochrone.
   */
  sar_type?: string;
  /**
   * Maximum detour in estimated minutes from route.
   */
  time_deviation?: string | number;
  /**
   * Used to estimate the time of arrival from the location specified in {@link SearchBoxOptions#origin}.
   *
   * The only allowed value for this parameter is navigation. This parameter, along with {@link SearchBoxOptions#origin} and {@link SearchBoxOptions#navigation_profile}, is required for ETA calculations.
   *
   * ETA calculations will incur additional latency.
   */
  eta_type?: 'navigation';
  /**
   * An [ISO 3166 alpha-2 country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) to be returned.
   *
   * If not specified, results will not be filtered by country.
   */
  country?: string;
  /**
   * Limit results to one or more types of features. If no types are specified, all possible types may be returned.
   *
   * Reference:
   * https://docs.mapbox.com/api/search/search-box/#administrative-unit-types
   */
  types?: string | Set<SearchBoxAdministrativeUnitTypes>;
  /**
   * Limit results to those that belong to one or more categories, provided as a comma-separated list.
   */
  poi_category?: string;
  /**
   * A comma-separated list of rich metadata providers to include in a suggestion result.
   */
  rich_metadata_provider?: string;
  /**
   * A comma-separated list of canonical category names that limits POI results to those that are not part of the given categories.
   */
  poi_category_exclusions?: string;
}

/**
 * A `SearchBoxSuggestionResponse` object represents a returned data object from the `suggest` endpoint of the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/#response-get-suggested-results).
 *
 * @typedef SearchBoxSuggestionResponse
 * Reference:
 * https://docs.mapbox.com/api/search/search-box/#response-get-suggested-results
 */
export interface SearchBoxSuggestionResponse {
  /**
   * The attribution data for results.
   */
  attribution?: string;
  /**
   * The returned suggestion objects.
   *
   * @see {@link SearchBoxSuggestion}
   */
  suggestions: SearchBoxSuggestion[];
  url?: string;
}

/**
 * A `SearchBoxRetrieveResponse` object represents a returned data object from the `/retrieve` endpoint of the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/#response-retrieve-a-suggested-feature).
 *
 * @typedef SearchBoxRetrieveResponse
 * Reference:
 * https://docs.mapbox.com/api/search/search-box/#response-retrieve-a-suggested-feature
 */
export interface SearchBoxRetrieveResponse {
  type: 'FeatureCollection';
  /**
   * The attribution data for results.
   */
  attribution?: string;
  /**
   * The returned feature objects.
   *
   * @see {@link SearchBoxFeatureSuggestion}
   */
  features: SearchBoxFeatureSuggestion[];
  url?: string;
}

/**
 * @typedef SearchBoxReverseResponse
 * Reference:
 * https://docs.mapbox.com/api/search/search-box/#response-perform-a-reverse-lookup
 */
export interface SearchBoxReverseResponse {
  type: 'FeatureCollection';
  /**
   * The attribution data for results.
   */
  attribution?: string;
  /**
   * The returned feature objects.
   *
   * @see {@link SearchBoxFeatureSuggestion}
   */
  features: SearchBoxFeatureSuggestion[];
  url?: string;
}

/**
 * @typedef SearchBoxCategoryResponse
 * Reference:
 * https://docs.mapbox.com/api/search/search-box/#response-retrieve-pois-by-category
 */
export interface SearchBoxCategoryResponse {
  type: 'FeatureCollection';
  /**
   * The attribution data for results.
   */
  attribution?: string;
  /**
   * The returned feature objects.
   *
   * @see {@link SearchBoxCategorySuggestion}
   */
  features: SearchBoxCategorySuggestion[];
  url?: string;
}

/**
 * A `SearchBoxCore` object is an application's main entrypoint to the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/).
 *
 * `SearchBoxCore` is focused on the two-step, interactive search experience. These steps are:
 *   1. {@link SearchBoxCore#suggest}: The user enters a search term, and a list of suggested results is returned with
 *      optional data such as: eta, distance calculations, etc.
 *   2. {@link SearchBoxCore#retrieve}: The user selects a result from the list of suggested results, and the
 *     corresponding geographic coordinates are returned for displaying on a map or otherwise manipulating.
 *
 * A [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) is required to use `SearchBoxCore`, and
 * other options may be specified either in the constructor or in the {@link SearchBoxCore#suggest} call.
 *
 * @class SearchBoxCore
 * @param {SearchBoxOptions} [options]
 * @param {string} [options.accessToken]
 *
 * @example
 * ```typescript
 * const search = new SearchBoxCore({ accessToken: 'pk.my-mapbox-access-token' });
 *
 * const sessionToken = new SessionToken();
 * const result = await search.suggest('Washington D.C.', { sessionToken });
 * if (result.suggestions.length === 0) return;
 *
 * const suggestion = result.suggestions[0];
 * const { features } = await search.retrieve(suggestion, { sessionToken });
 * doSomethingWithCoordinates(features);
 * ```
 */
export class SearchBoxCore {
  static defaults: Partial<SearchBoxOptions> = {
    language: 'en'
  };

  /**
   * The [Mapbox access token](https://docs.mapbox.com/help/glossary/access-token/) to use for all requests.
   */
  accessToken: string;

  /**
   * Any default options ({@link SearchBoxOptions}) to be merged into options in the following methods:
   * - {@link SearchBoxCore#suggest}
   * - {@link SearchBoxCore#retrieve}
   * - {@link SearchBoxCore#reverse}
   */
  defaults: Partial<SearchBoxOptions>;

  constructor(options: Partial<AccessTokenOptions & SearchBoxOptions> = {}) {
    const { accessToken, ...defaults } = options;

    this.accessToken = accessToken;

    // Assign defaults to this.defaults.
    this.defaults = {
      ...SearchBoxCore.defaults,
      ...defaults
    };
  }

  /** @section {Interactive search} */

  /**
   * {@link SearchBoxCore#suggest} is "part one" of the two-step interactive search experience, and includes
   * useful information such as: {@link SearchBoxSuggestion#name}, {@link SearchBoxSuggestion#place_formatted}, and {@link SearchBoxSuggestion#maki}.
   *
   * Suggestion objects **do not include geographic coordinates**. To get the coordinates of the result, use {@link SearchBoxCore#retrieve}.
   *
   * For tracking purposes, it is useful for any follow-up requests based on this suggestion to include same
   * {@link SessionToken} as the original request.
   *
   * If you'd like session tokens to be handled automatically, see {@link SearchSession}.
   *
   * @param {string} searchText
   * @param {SearchBoxOptions} optionsArg
   * @param {SessionTokenLike} optionsArg.sessionToken
   * @param {AbortSignal} [optionsArg.signal]
   */
  async suggest(
    searchText: string,
    optionsArg: SessionTokenOptions &
      Partial<FetchOptions & SearchBoxOptions & ComponentOptions>
  ): Promise<SearchBoxSuggestionResponse> {
    if (!searchText) {
      throw new Error('searchText is required');
    }

    const isReverseQuery = COORDINATE_QUERY_REGEX.test(searchText);
    if (isReverseQuery && optionsArg.allowReverse) {
      let coordinates = searchText
        .trim()
        .split(SPACES_OR_COMMA_REGEX)
        .map((part) => part.trim());
      if (optionsArg.flipCoordinates) {
        coordinates = coordinates.reverse();
      }
      const coordinatesString = coordinates.join(',');
      const reverseResponse = await this.reverse(coordinatesString, optionsArg);
      return this.#convertReverseResponsetoSuggestionResponse(reverseResponse);
    }

    const { sessionToken, signal } = optionsArg;

    const options = {
      ...this.defaults,
      ...optionsArg,
      q: searchText,
      sessionToken
    };

    if (options.eta_type && (!options.origin || !options.navigation_profile)) {
      throw new Error(
        'to provide eta estimate: eta, navigation_profile, and origin are required'
      );
    }
    if (options.origin && !options.navigation_profile) {
      throw new Error(
        'to provide distance estimate: both navigation_profile and origin are required'
      );
    }

    const url = new URL(SUGGEST_URL);
    url.search = this.#getQueryParams(options);

    const { fetch } = getFetch();
    const res = await fetch(url.toString(), {
      signal
    });

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as SearchBoxSuggestionResponse;

    // Augment the response with SDK-specific properties.
    json.url = url.toString();
    json.suggestions?.forEach((suggestion) => {
      suggestion._source = 'mapbox';
    });

    return json;
  }

  /**
   * {@link SearchBoxCore#retrieve} is "part two" of the two-step interactive search experience and includes
   * geographic coordinates in [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) format.
   *
   * `suggestion` is usually a {@link SearchBoxSuggestion} returned from "part one," {@link SearchBoxCore#suggest}.
   *
   * Multiple feature suggestions may be returned from a single search query, for example in an airport with
   * multiple terminals.
   *
   * **Legal terms:**
   *
   * The [Mapbox Terms of Service](https://www.mapbox.com/tos/) states any rendering of a feature suggestion
   * must be using Mapbox map services (for example, displaying results on Google Maps or MapKit JS is not allowed).
   *
   * **Disclaimer:**
   *
   * The failure of Mapbox to exercise or enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
   *
   * @param {any} optionsArg
   * @param {SessionTokenLike} optionsArg.sessionToken
   * @param {AbortSignal} [optionsArg.signal]
   */
  async retrieve(
    suggestion: SearchBoxSuggestion,
    optionsArg: SessionTokenOptions &
      Partial<FetchOptions & Pick<SearchBoxOptions, 'language'>>
  ): Promise<SearchBoxRetrieveResponse> {
    if (!suggestion) {
      throw new Error('suggestion is required');
    }

    if (suggestion._originalFeature) {
      // The suggestion was previously converted from a feature;
      // we don't need to re-retrieve it, and can just return the original feature.
      const retrieveResponse: SearchBoxRetrieveResponse = {
        type: 'FeatureCollection',
        features: [suggestion._originalFeature],
        url: suggestion._originalUrl || ''
      };
      return retrieveResponse;
    }

    if (suggestion._geometry) {
      // The suggestion is artificially created, e.g. from a client-defined
      // "customSearch" function on a web component. We need to convert it
      // to the appropriate retrieve response type before returning it.
      const retrieveResponse: SearchBoxRetrieveResponse = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: suggestion as unknown as SearchBoxFeatureProperties,
            geometry: suggestion._geometry
          }
        ]
      };
      return retrieveResponse;
    }

    const { sessionToken: sessionTokenLike, signal, language } = optionsArg;

    const sessionToken = SessionToken.convert(sessionTokenLike);

    const options = {
      ...this.defaults,
      ...(language && { language })
    };

    const url = new URL(
      `${RETRIEVE_URL}/${encodeURIComponent(suggestion.mapbox_id)}`
    );
    url.search = queryParams(
      {
        access_token: this.accessToken,
        session_token: sessionToken.id
      },
      { language: options.language }
    );

    const { fetch } = getFetch();
    const res = await fetch(url.toString(), {
      signal
    });

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as SearchBoxRetrieveResponse;
    json.url = url.toString();
    return json;
  }

  /** @section {Programmatic search} */

  /**
   * {@link SearchBoxCore#category} makes it possible to browse entire categories of results,
   * like coffee shops, hotels, and bookstores around a specific location or along a route and returns feature collection
   * in [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) format.
   *
   * **Legal terms:**
   *
   * The [Mapbox Terms of Service](https://www.mapbox.com/tos/) states any rendering of a feature suggestion
   * must be using Mapbox map services (for example, displaying results on Google Maps or MapKit JS is not allowed).
   *
   * **Disclaimer:**
   *
   * The failure of Mapbox to exercise or enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
   *
   * @param {Options} optionsArg
   * @param {AbortSignal} [optionsArg.signal]
   * @param {boolean} [optionsArg.permanent]
   */
  async category(
    category: string,
    optionsArg: Partial<FetchOptions & SearchBoxOptions> = {}
  ): Promise<SearchBoxCategoryResponse> {
    if (!category) {
      throw new Error('category is required');
    }

    const options = {
      ...this.defaults,
      ...optionsArg
    };

    const url = new URL(`${CATEGORY_URL}/${encodeURIComponent(category)}`);
    url.search = this.#getQueryParams(options);

    const { fetch } = getFetch();
    const res = await fetch(url.toString(), {
      signal: options.signal
    });

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as SearchBoxCategoryResponse;
    json.url = url.toString();

    return json;
  }

  /**
   * {@link SearchBoxCore#reverse} endpoint allows you to look up a single pair of coordinates and returns the geographic feature or features
   * that exist at that location. The response to a request is a [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) FeatureCollection.
   *
   * Using the limit parameter, you can increase the maximum number of results up to 10. Pagination is not available, but this feature may be added in a later release.
   * There is not an option to customize the order of search results.
   *
   * Multiple feature suggestions may be returned from a single search query, for example in an airport with
   * multiple terminals.
   *
   * **Legal terms:**
   *
   * The [Mapbox Terms of Service](https://www.mapbox.com/tos/) states any rendering of a feature suggestion
   * must be using Mapbox map services (for example, displaying results on Google Maps or MapKit JS is not allowed).
   *
   * **Disclaimer:**
   *
   * The failure of Mapbox to exercise or enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
   *
   * @param lngLat - Either a {@link LngLatLike} object or string in 'lng,lat' comma-separated format.
   * @param {Options} optionsArg
   * @param {AbortSignal} [optionsArg.signal]
   */
  async reverse(
    lngLat: string | LngLatLike,
    optionsArg: Partial<FetchOptions & SearchBoxOptions> = {}
  ): Promise<SearchBoxReverseResponse> {
    if (!lngLat) {
      throw new Error('lngLat is required');
    }

    const [lng, lat] =
      typeof lngLat === 'string'
        ? lngLat.split(',').map((x) => parseFloat(x))
        : LngLat.convert(lngLat).toArray();

    if (isNaN(lng) || isNaN(lat)) {
      throw new Error('lngLat is required');
    }

    const options = {
      ...this.defaults,
      ...optionsArg
    };

    const url = new URL(REVERSE_URL);

    url.search = queryParams(
      {
        access_token: this.accessToken,
        language: options.language,
        limit: options.limit,
        longitude: lng,
        latitude: lat
      },
      options.types && {
        types:
          typeof options.types === 'string'
            ? options.types
            : [...options.types].join(',')
      }
    );

    const { fetch } = getFetch();
    const res = await fetch(url.toString(), {
      signal: options.signal
    });

    // Throw custom error if status code is not 200.
    await handleNonOkRes(res);

    const json = (await res.json()) as SearchBoxReverseResponse;

    // Augment the response with SDK-specific properties.
    json.url = url.toString();
    json.features?.forEach((feature) => {
      feature._source = 'mapbox';
    });

    return json;
  }

  /**
   * Returns the query parameters used by {@link SearchBoxCore#suggest}
   */
  #getQueryParams(
    options: Partial<
      SearchBoxOptions & SessionTokenOptions & SearchQueryOptions
    >
  ): string {
    return queryParams(
      {
        q: options.q,
        access_token: this.accessToken,
        language: options.language,
        limit: options.limit,
        navigation_profile: options.navigation_profile,
        route: options.route,
        route_geometry: options.route_geometry,
        sar_type: options.sar_type,
        time_deviation: options.time_deviation,
        eta_type: options.eta_type,
        country: options.country,
        poi_category: options.poi_category,
        rich_metadata_provider: options.rich_metadata_provider,
        poi_category_exclusions: options.poi_category_exclusions
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
      options.origin && {
        origin:
          typeof options.origin === 'string'
            ? options.origin
            : LngLat.convert(options.origin).toArray().join(',')
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

  #convertReverseResponsetoSuggestionResponse(
    response: SearchBoxReverseResponse
  ): SearchBoxSuggestionResponse {
    return {
      suggestions: response.features.map((feature) => {
        return this.#convertSearchBoxFeaturetoSuggestion(feature, response.url);
      }),
      attribution: response.attribution,
      url: response.url
    };
  }

  #convertSearchBoxFeaturetoSuggestion(
    feature: SearchBoxFeatureSuggestion,
    responseUrl: string
  ): SearchBoxSuggestion {
    return {
      ...(feature.properties as unknown as SearchBoxSuggestion),
      _originalFeature: feature,
      _originalUrl: responseUrl,
      _source: feature._source
    };
  }
}
