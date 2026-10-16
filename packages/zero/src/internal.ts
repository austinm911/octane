import type { ReadonlyJSONValue } from '@rocicorp/zero';

const subSlotCache = new Map<symbol, Map<string, symbol>>();

export function subSlot(slot: symbol | undefined, tag: string): symbol | undefined {
	if (slot === undefined) return undefined;
	let byTag = subSlotCache.get(slot);
	if (byTag === undefined) subSlotCache.set(slot, (byTag = new Map()));
	let result = byTag.get(tag);
	if (result === undefined) {
		byTag.set(tag, (result = Symbol.for((slot.description ?? '') + ':' + tag)));
	}
	return result;
}

export function stringCompare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

type ReadonlyJSONObject = { readonly [key: string]: ReadonlyJSONValue | undefined };

const isJSONObject = (value: ReadonlyJSONValue): value is ReadonlyJSONObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Port of `deepEqual` from @rocicorp/zero 1.11.0 `shared/src/json.ts`, which
 * the package does not export. Properties whose value is undefined count as
 * absent, so `{a: undefined}` equals `{}`.
 */
export function deepEqual(
	a: ReadonlyJSONValue | undefined,
	b: ReadonlyJSONValue | undefined,
): boolean {
	if (a === b) return true;
	if (a === undefined || b === undefined) return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	if (!isJSONObject(a) || !isJSONObject(b)) return false;
	let aSize = 0;
	for (const key in a) {
		if (Object.hasOwn(a, key) && a[key] !== undefined) {
			if (!deepEqual(a[key], b[key])) return false;
			aSize++;
		}
	}
	let bSize = 0;
	for (const key in b) {
		if (Object.hasOwn(b, key) && b[key] !== undefined) bSize++;
	}
	return aSize === bSize;
}
