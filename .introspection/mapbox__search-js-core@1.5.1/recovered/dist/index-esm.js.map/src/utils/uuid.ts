const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates the UUID v4.
 * @param id - UUID value.
 */
export function validateUUID(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Generates a RFC4122 v4 UUID (pseudo-randomly-based)
 *
 * IMPORTANT: THIS IS NOT CRYPTO-GRAPHICALLY SECURE!
 *
 * Since we're using this to generate a random UUID, essentially as an SKU,
 * we don't need to worry about the randomness of the values as much.
 */
export function generateUUID(): string {
  const randomString =
    Math.random().toString(16) +
    Date.now().toString(16) +
    Math.random().toString(16);

  const uuidString = randomString.replace(/\./g, '');

  const uuid = [
    uuidString.slice(0, 8),
    uuidString.slice(8, 12),
    '4' + uuidString.slice(12, 15) + '-8' + uuidString.slice(15, 18),
    uuidString.slice(18, 30)
  ].join('-');

  return uuid;
}
