import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceLayerHarness } from '../_fixtures/source-layer';
import { flushEffects, mount, nextPaint } from '../_helpers';

const initialData = { type: 'FeatureCollection', features: [] } as const;
const nextData = {
	type: 'FeatureCollection',
	features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} }],
} as const;

function createStyleMap() {
	const source = { setData: vi.fn() };
	let hasSource = false;
	let hasLayer = false;
	const calls: string[] = [];
	return {
		style: { _loaded: true },
		source,
		calls,
		on: vi.fn(),
		off: vi.fn(),
		addSource: vi.fn(() => {
			hasSource = true;
			calls.push('add-source');
		}),
		getSource: vi.fn(() => (hasSource ? source : undefined)),
		removeSource: vi.fn(() => {
			hasSource = false;
			calls.push('remove-source');
		}),
		addLayer: vi.fn(() => {
			hasLayer = true;
			calls.push('add-layer');
		}),
		getLayer: vi.fn(() => (hasLayer ? { id: 'place-points' } : undefined)),
		removeLayer: vi.fn(() => {
			hasLayer = false;
			calls.push('remove-layer');
		}),
		getStyle: vi.fn(() => ({ layers: hasLayer ? [{ id: 'place-points', source: 'places' }] : [] })),
		setPaintProperty: vi.fn(),
		setLayoutProperty: vi.fn(),
		setFilter: vi.fn(),
		setLayerZoomRange: vi.fn(),
		moveLayer: vi.fn(),
	};
}

// Adapted from modules/react-mapbox/test/components/source.spec.jsx and layer.spec.jsx.
describe('Source and Layer lifecycle', () => {
	beforeEach(() => vi.useRealTimers());

	it('creates in dependency order, reconciles mutable props, and removes layers before sources', async () => {
		const map = createStyleMap();
		const result = mount(SourceLayerHarness, { map, data: initialData, radius: 4 });
		flushEffects();

		expect(map.calls.slice(0, 2)).toEqual(['add-source', 'add-layer']);
		expect(map.addLayer).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'place-points', source: 'places', type: 'circle' }),
			undefined,
		);

		result.update(SourceLayerHarness, { map, data: nextData, radius: 8 });
		expect(map.source.setData).toHaveBeenCalledWith(nextData);
		expect(map.setPaintProperty).toHaveBeenCalledWith('place-points', 'circle-radius', 8);

		result.unmount();
		flushEffects();
		await nextPaint();
		expect(map.calls.slice(-2)).toEqual(['remove-layer', 'remove-source']);
	});
});
