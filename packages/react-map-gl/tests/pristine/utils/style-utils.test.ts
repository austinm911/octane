import { describe, expect, it } from 'vitest';
import { normalizeStyle as mapbox } from '../../../upstream/modules/react-mapbox/src/utils/style-utils';
import { normalizeStyle as maplibre } from '../../../upstream/modules/react-maplibre/src/utils/style-utils';

for (const [engine, normalizeStyle] of Object.entries({ mapbox, maplibre })) {
	describe(`${engine}: upstream style utility`, () => {
		it('normalizes without mutating plain and immutable-like styles', () => {
			expect(normalizeStyle(null as never)).toBeNull();
			expect(normalizeStyle('mapbox://styles/mapbox/light-v9')).toBe(
				'mapbox://styles/mapbox/light-v9',
			);
			const style = {
				version: 8 as const,
				sources: { mapbox: { type: 'vector' as const, url: 'mapbox://streets' } },
				layers: [
					{ id: 'park', type: 'fill' as const, source: 'mapbox', minzoom: 5, interactive: true },
					{ id: 'park-copy', ref: 'park', minzoom: 10, paint: { 'fill-color': '#00f080' } },
				],
			};
			const frozen = structuredClone(style);
			Object.freeze(style.layers[0]);
			Object.freeze(style.layers[1]);
			Object.freeze(style.layers);
			Object.freeze(style);
			const expected = {
				version: 8,
				sources: { mapbox: { type: 'vector', url: 'mapbox://streets' } },
				layers: [
					{ id: 'park', type: 'fill', source: 'mapbox', minzoom: 5 },
					{
						id: 'park-copy',
						type: 'fill',
						source: 'mapbox',
						minzoom: 5,
						paint: { 'fill-color': '#00f080' },
					},
				],
			};
			expect(normalizeStyle(style as never)).toEqual(expected);
			expect(style).toEqual(frozen);
			expect(normalizeStyle({ toJS: () => style } as never)).toEqual(expected);
		});
	});
}
