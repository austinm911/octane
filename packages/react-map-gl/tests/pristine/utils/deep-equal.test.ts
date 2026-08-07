import { describe, expect, it } from 'vitest';
import * as mapbox from '../../../upstream/modules/react-mapbox/src/utils/deep-equal';
import * as maplibre from '../../../upstream/modules/react-maplibre/src/utils/deep-equal';

for (const [engine, { deepEqual, arePointsEqual }] of Object.entries({ mapbox, maplibre })) {
	describe(`${engine}: upstream deep-equal utility`, () => {
		it.each([
			[null, null, true],
			[undefined, 0, false],
			[[1, 2, 3], [1, 2, 3], true],
			[[1, 2], [1, 2, 3], false],
			[[1, 2], { 0: 1, 1: 2 }, false],
			[{ x: 0, y: 0, offset: [1, -1] }, { x: 0, y: 0, offset: [1, -1] }, true],
			[{ x: 0, y: 0 }, { x: 0, y: 0, offset: [1, -1] }, false],
			[{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, offset: [1, -1] }, false],
		] as const)('compares %j and %j', (a, b, result) => {
			expect(deepEqual(a, b)).toBe(result);
			expect(deepEqual(b, a)).toBe(result);
		});

		it.each([
			[undefined, undefined, true],
			[undefined, [0, 0], true],
			[undefined, [0, 1], false],
			[undefined, [1, 0], false],
			[{ x: 1, y: 1 }, [1, 1], true],
		] as const)('compares points %j and %j', (a, b, result) => {
			expect(arePointsEqual(a, b)).toBe(result);
			expect(arePointsEqual(b, a)).toBe(result);
		});
	});
}
