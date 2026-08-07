import { describe, expect, it } from 'vitest';
import { compareClassNames as mapbox } from '../../../src/engines/mapbox/utils/compare-class-names';
import { compareClassNames as maplibre } from '../../../src/engines/maplibre/utils/compare-class-names';

for (const [engine, compareClassNames] of Object.entries({ mapbox, maplibre })) {
	describe(`${engine}: upstream compare-class-names utility`, () => {
		it.each([
			['', '', null],
			['marker active', 'active  marker ', null],
			[undefined, 'marker', ['marker']],
			['marker', 'marker active', ['active']],
			['marker active', 'marker', ['active']],
			['marker active', 'marker hovered hidden', ['hovered', 'hidden', 'active']],
		] as const)('compares %j to %j', (previous, next, output) => {
			expect(compareClassNames(previous, next)).toEqual(output);
		});
	});
}
