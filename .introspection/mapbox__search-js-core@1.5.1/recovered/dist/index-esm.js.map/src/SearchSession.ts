/* eslint-disable prefer-const */
import { SessionToken, SessionTokenLike } from './SessionToken';

import { getFetch } from './fetch';

import { Evented } from './utils/Evented';
import { debounce } from './utils/debounce';
import { AddressAutofillCore } from './autofill/AddressAutofillCore';

/**
 * Shortcut function to create a new AbortController from the polyfill.
 */
function createAbortController(): AbortController {
  const { AbortController } = getFetch();
  return new AbortController();
}

interface EventTypes<SuggestionResponse, RetrieveResponse> {
  suggest: SuggestionResponse;
  suggesterror: Error;
  retrieve: RetrieveResponse;
}

/**
 * TypeScript magic section: what is this?
 *
 * Despite the name {@link SearchSession}, in Search JS Web we use it to control
 * both {@link SearchBoxCore} **and** {@link AddressAutofillCore} instances. Both
 * of these have similar workflows, but are separate APIs with different options
 * and responses.
 *
 * In order to make TypeScript happy, this type is an "approximation" of what
 * {@link SearchSession} uses. When you construct a new {@link SearchSession},
 * because of this type [Options, Suggestion, SuggestionResponse, RetrieveResponse]
 * are automatically inferred.
 *
 * @internal
 * @example
 * ```typescript
 * const autofill = new AddressAutofillCore({
 *  accessToken: 'pk.my-fancy-token',
 * });
 *
 * const session = new SearchSession(autofill);
 *
 * `session` has inferred type = SearchSession<
 *   AddressAutofillOptions,
 *   AddressAutofillSuggestion,
 *   AddressAutofillSuggestionResponse,
 *   AddressAutofillRetrieveResponse
 * >
 * ```
 */
type SuggestSearch<Options, Suggestion, SuggestionResponse, RetrieveResponse> =
  {
    suggest: (
      text: string,
      options: Partial<Options> & {
        sessionToken: SessionTokenLike;
        signal: AbortSignal;
      }
    ) => Promise<SuggestionResponse>;
    retrieve: (
      suggestion: Suggestion,
      options: Partial<Options> & {
        sessionToken: SessionTokenLike;
      }
    ) => Promise<RetrieveResponse>;
    canRetrieve?: (suggestion: Suggestion) => boolean;
    canSuggest?: (suggestion: Suggestion) => boolean;
  };

/**
 * A `SearchSession` object is a managed entrypoint to the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/)
 * or Mapbox Address Autofill API.
 *
 * `SearchSession` abstracts the suggest/retrieve flow of the two-step interactive search experience.
 *
 * Compared to using these APIs directly, you can use a `SearchSession` to:
 * 1. Automatically manage the session token lifecycle.
 * 2. Debounce calls to {@link SearchSession#suggest}.
 * 2. Abort in-flight requests with an imperative API.
 *
 * @class SearchSession
 * @example
 * ```typescript
 * const search = new SearchBoxCore({ accessToken: 'pk.my-mapbox-access-token' });
 * const session = new SearchSession(search);
 *
 * session.addEventListener('suggest', (res) => {
 *   presentResultsToUser(res.suggestions);
 * });
 *
 * session.addEventListener('retrieve', (res) => {
 *   doSomethingWithFeatureCollection(res);
 * });
 *
 * document.querySelector('button').addEventListener('click', (event) => {
 *   const suggestions = session.suggestions?.suggestions;
 *   if (!suggestions || !suggestions.length) {
 *     return;
 *   }
 *
 *   const suggestion = suggestions[0];
 *   if (session.canRetrieve(suggestion)) {
 *     session.retrieve(suggestion);
 *   } else if (session.canSuggest(suggestion)) {
 *     // .. go through suggest flow again ..
 *     session.suggest(suggestion.text);
 *   }
 * });
 *
 * session.suggest('Washington D.C.');
 * ```
 * @param {SearchBoxCore | AddressAutofillCore} search - The search interface to wrap.
 * @param {number} wait - The time in milliseconds to wait before sending a new request to the {@link SearchSession#suggest} call.
 */
export class SearchSession<
  Options,
  Suggestion,
  SuggestionResponse,
  RetrieveResponse
> extends Evented<EventTypes<SuggestionResponse, RetrieveResponse>> {
  readonly search: SuggestSearch<
    Options,
    Suggestion,
    SuggestionResponse,
    RetrieveResponse
  >;

  /**
   * The time in milliseconds to wait before sending a new request to the
   * {@link SearchSession#suggest} call.
   */
  readonly debounce: number;

  #sessionTokenBase = new SessionToken();
  /**
   * Counter that is incremented each time a new search is started
   * (e.g. when the search text is cleared).
   */
  #sessionIncrementer = 0;
  /**
   * If true, the session token is an explicitly-set value and should not be incremented.
   */
  #sessionTokenCustom = false;

  /**
   * The session token is an SKU (billing token) used to identify the current
   * search session and provide analytics to the customer.
   *
   * As per {@link SessionToken}, this is a UUIDv4 value.
   *
   */
  get sessionToken(): string {
    if (this.#sessionTokenCustom) {
      return this.#sessionTokenBase.id;
    }
    return `${this.#sessionTokenBase.id}.${this.#sessionIncrementer}`;
  }
  set sessionToken(token: string) {
    this.#sessionTokenCustom = true;
    this.#sessionTokenBase = new SessionToken(token);
  }

  #suggestions: SuggestionResponse | null;

  /**
   * The suggestions from the last successful suggest call, if any.
   */
  get suggestions(): SuggestionResponse | null {
    return this.#suggestions;
  }

  constructor(
    search: SuggestSearch<
      Options,
      Suggestion,
      SuggestionResponse,
      RetrieveResponse
    >,
    wait = 0
  ) {
    super();

    // Set 'suggest' method using debounce.
    this.#suggestDebounce = debounce(
      async (
        searchText: string,
        options: Partial<Options> = {}
      ): Promise<void> => {
        // Refresh abort controller.
        this.#abort.abort();
        this.#abort = createAbortController();

        if (!searchText) {
          this.#suggestions = null;
          this.fire('suggest', this.#suggestions);
          return;
        }

        try {
          const res = await this.search.suggest(searchText, {
            sessionToken: this.sessionToken,
            ...options,
            signal: this.#abort.signal
          });

          this.#suggestions = res;
          this.fire('suggest', res);
        } catch (err) {
          if (err.name === 'AbortError') {
            return;
          }

          this.fire('suggesterror', err);
        }
      },
      wait,
      () => this.#abort.signal
    );

    /**
     * Define properties using {@link Object#defineProperties} so they are readonly during runtime,
     * not just in TypeScript.
     */
    Object.defineProperties(this, {
      search: {
        value: search,
        writable: false
      },
      debounce: {
        value: wait,
        writable: false
      }
    });
  }

  /**
   * The {@link AbortController} is used to abort the current suggest, either
   * because of a new {@link SearchSession#suggest} call, or because
   * of {@link SearchSession#abort}.
   *
   * In both of these cases, a new {@link AbortController} is created,
   * and the old one is aborted.
   */
  #abort = createAbortController();

  #suggestDebounce: (searchText: string, options?: Partial<Options>) => void;

  /** @section {Methods} */

  /**
   * {@link SearchSession#suggest} is "part one" of the two-step interactive search experience,
   * and each suggestion includes metadata to present to the user.
   *
   * Suggestion objects **do not include geographic coordinates**. To get the coordinates of the result, use {@link SearchSession#retrieve}.
   *
   * It may be useful to call {@link SearchSession#canRetrieve} before calling this method, as the suggestion may be a reference to
   * another suggest query. This can also be tested with {@link SearchSession#canSuggest}, and further calls to {@link SearchSession#suggest}.
   *
   * Results can be retrieved with the "suggest" event.
   *
   * @example
   * ```typescript
   * const search = new SearchBoxCore({ accessToken: 'pk.my-mapbox-access-token' });
   * const session = new SearchSession(search);
   *
   * session.addEventListener('suggest', (res) => {
   *   presentResultsToUser(res.suggestions);
   * });
   *
   * session.suggest('Washington D.C.');
   * ```
   */
  suggest(
    searchText: string,
    options?: Partial<Options>
  ): Promise<SuggestionResponse> {
    this.#suggestDebounce(searchText, options);

    return new Promise((resolve, reject) => {
      let suggestFn: (val: SuggestionResponse) => void;
      let suggestErrorFn: (val: Error) => void;

      suggestFn = (res) => {
        this.removeEventListener('suggest', suggestFn);
        this.removeEventListener('suggesterror', suggestErrorFn);
        resolve(res);
      };
      suggestErrorFn = (err) => {
        this.removeEventListener('suggest', suggestFn);
        this.removeEventListener('suggesterror', suggestErrorFn);
        reject(err);
      };

      this.addEventListener('suggest', suggestFn);
      this.addEventListener('suggesterror', suggestErrorFn);
    });
  }

  /**
   * Clears the current suggestions.
   */
  clear(): void {
    this.suggest('');
  }

  /**
   * {@link SearchSession#retrieve} is "part two" of the two-step interactive search experience and includes
   * geographic coordinates in [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) format.
   *
   * {@link suggestion} is usually a {@link Suggestion} returned from "part one," {@link SearchSession#suggest}.
   *
   * Multiple feature suggestions may be returned from a single search query, for example in an airport with
   * multiple terminals.
   *
   * **Legal terms:**
   *
   * Due to legal terms from our data sources, results should not be stored in a customer database.
   * Results should be used ephemerally and not persisted.
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
   */
  async retrieve(
    suggestion: Suggestion,
    options?: Partial<Options>
  ): Promise<RetrieveResponse> {
    const res = await this.search.retrieve(suggestion, {
      sessionToken: this.sessionToken,
      ...options
    });

    this.fire('retrieve', res);
    return res;
  }

  /**
   * Returns true if {@link SearchSession#retrieve} can be called on this suggestion,
   * false otherwise.
   *
   * This indicates the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/) has geographic coordinates
   * for this suggestion.
   *
   * This method is mutually exclusive with {@link SearchSession#canSuggest}.
   */
  canRetrieve(suggestion: Suggestion): boolean {
    if (!this.search.canRetrieve) {
      return true;
    }

    return this.search.canRetrieve(suggestion);
  }

  /**
   * Returns true if {@link SearchSession#suggest} can be called on this suggestion,
   * false otherwise.
   *
   * This indicates the [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/) wants to do another
   * suggestion search on this result, and does not have geographic coordinates.
   *
   * This method is mutually exclusive with {@link SearchSession#canRetrieve}.
   */
  canSuggest(suggestion: Suggestion): boolean {
    if (!this.search.canSuggest) {
      return true;
    }

    return this.search.canSuggest(suggestion);
  }

  /**
   * Aborts the current {@link SearchSession#suggest} request.
   */
  abort(): void {
    this.#abort.abort();
    this.#abort = createAbortController();
  }

  /**
   * Increments the session counter.
   */
  incrementSession(): void {
    this.#sessionIncrementer++;
  }
}
