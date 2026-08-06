/* eslint-disable @typescript-eslint/no-explicit-any */

// GLOBALS
let _fetchImpl: typeof fetch = globalThis.fetch;
let _abortControllerImpl: typeof AbortController = globalThis.AbortController;

interface FetchImplementation {
  fetch: typeof fetch;
  AbortController: typeof AbortController;
}

/**
 * Polyfills {@link fetch} implementation used in Search JS Core.
 *
 * If a `fetch` implementation is already available, the polyfill will be
 * silently ignored.
 *
 * When running Search JS Core in a Node.js environment, fetch must be either
 * polyfilled globally or passed into this function before usage of
 * internal library functionality.
 *
 * @param opts Options for the polyfill.
 * @param {fetch} opts.fetch Required. A custom `fetch` implementation.
 * @param {AbortController} opts.AbortController Required. A custom `AbortController` implementation.
 * @param {boolean} force If `true`, the polyfill will be forced to load. Otherwise, it will only load if `fetch` is not available.
 */
export function polyfillFetch(
  { fetch, AbortController }: FetchImplementation,
  force = false
): void {
  if (!fetch) {
    throw new Error(
      'Fetch implementation must include implementations of `fetch`.'
    );
  }

  if (_fetchImpl && !force) {
    return;
  }
  _fetchImpl = fetch;
  _abortControllerImpl = AbortController;
}

/**
 * Returns the {@link FetchImplementation} used by Search JS Core.
 */
export function getFetch(): FetchImplementation {
  if (!_fetchImpl) {
    throw new Error(
      'Fetch implementation not found. Please include a fetch polyfill in your application or use `polyfillFetch` from `@mapbox/search-js-core` to fix this issue.'
    );
  }

  return {
    fetch: _fetchImpl,
    AbortController: _abortControllerImpl
  };
}
