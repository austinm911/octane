/* eslint-disable @typescript-eslint/no-explicit-any */

import { SessionToken } from '@mapbox/search-js-core';
import { MAPBOX_DOMAINS } from '../constants';

/**
 * Returns a random ID that is valid as a CSS identifier.
 *
 * CSS identifiers cannot start with a number, so we prefix the ID with `mbx`.
 */
export function randomValidID(): string {
  return `mbx` + new SessionToken().id.slice(0, 8);
}

/**
 * Try to parse as a JSON object, returning `null` if it fails.
 */
export function tryParseJSON<T>(json: string): T | null {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function deepEquals<T>(a: T, b: T): boolean {
  if (a == null || b == null) {
    return a === b;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (!deepEquals(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Round a number to a given number of digits after the decimal
 * @param num - Number to round
 * @param decimalPlaces - Number of places after the decimal to round to
 * @returns Rounded decimal number
 */
export function round(num: number, decimalPlaces: number): number {
  const factorOfTen = Math.pow(10, decimalPlaces);
  return Math.round(num * factorOfTen) / factorOfTen;
}

/**
 * Returns true if a hostname matches a local server protocol
 * @param hostname - A string representing window.location.hostname
 * @returns A boolean value
 */
export function isLocalServer(hostname: string): boolean {
  return Boolean(
    hostname.match(
      /localhost|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|::1|\.local|^$/gi
    )
  );
}

/**
 * Returns true if a hostname matches a Mapbox domain
 * @param hostname - A string representing window.location.hostname
 * @returns A boolean value
 */
export function isMapboxDomain(hostname: string): boolean {
  return Boolean(MAPBOX_DOMAINS.some((domain) => hostname.includes(domain)));
}
