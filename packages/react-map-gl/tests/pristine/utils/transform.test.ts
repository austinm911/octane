import { describe, expect, it } from 'vitest';
import { LngLat } from 'maplibre-gl';
import * as maplibre from '../../../upstream/modules/react-maplibre/src/utils/transform';
import * as mapbox from '../../../upstream/modules/react-mapbox/src/utils/transform';

describe('maplibre: upstream transform utility', () => {
	const transform = () => ({
		center: new LngLat(-122.45, 37.78),
		zoom: 10.5,
		bearing: -70,
		pitch: 30,
		padding: { top: 0, left: 0, right: 0, bottom: 0 },
	});
	it('converts a transform to view state', () => {
		expect(maplibre.transformToViewState(transform() as never)).toEqual({
			longitude: -122.45,
			latitude: 37.78,
			zoom: 10.5,
			bearing: -70,
			pitch: 30,
			padding: { top: 0, left: 0, right: 0, bottom: 0 },
		});
	});
	it('detects requested changes', () => {
		const tr = transform() as never;
		expect(maplibre.applyViewStateToTransform(tr, {} as never)).toEqual({});
		expect(
			maplibre.applyViewStateToTransform(tr, { longitude: -10, latitude: 5 } as never),
		).toEqual({ center: new LngLat(-10, 5) });
		expect(
			maplibre.applyViewStateToTransform(tr, { zoom: 11, pitch: 30, bearing: -70 } as never),
		).toEqual({ zoom: 11 });
		expect(
			maplibre.applyViewStateToTransform(tr, {
				padding: { left: 10, right: 10, top: 10, bottom: 10 },
			} as never),
		).toEqual({ padding: { left: 10, right: 10, top: 10, bottom: 10 } });
		expect(maplibre.applyViewStateToTransform(tr, { viewState: { pitch: 30 } } as never)).toEqual(
			{},
		);
	});
});

class Point {
	constructor(
		public lng = 0,
		public lat = 0,
	) {}
}
function mapboxTransform() {
	const tr = {
		_center: new Point(),
		zoom: 0,
		pitch: 0,
		bearing: 0,
		padding: { left: 0, right: 0, top: 0, bottom: 0 },
		_centerAltitude: 0,
		_seaLevelZoom: null,
		elevation: 0,
		_unmodified: false,
		isPaddingEqual(value: object) {
			return JSON.stringify(this.padding) === JSON.stringify(value);
		},
		_constrain() {},
		_calcMatrices() {},
	};
	Object.defineProperty(tr, 'center', {
		get() {
			return tr._center;
		},
	});
	return tr;
}
describe('mapbox: upstream transform utility', () => {
	it('compares, applies, and reads view state', () => {
		const tr = mapboxTransform();
		expect(mapbox.compareViewStateWithTransform(tr as never, {})).toBe(false);
		for (const viewState of [
			{ longitude: -10, latitude: 5 },
			{ zoom: 10 },
			{ pitch: 30 },
			{ bearing: 270 },
			{ padding: { left: 10, right: 10, top: 10, bottom: 10 } },
		]) {
			expect(mapbox.compareViewStateWithTransform(tr as never, viewState)).toBe(true);
			mapbox.applyViewStateToTransform(tr as never, viewState);
		}
		expect(mapbox.transformToViewState(tr as never)).toEqual({
			longitude: -10,
			latitude: 5,
			zoom: 10,
			pitch: 30,
			bearing: 270,
			padding: { left: 10, right: 10, top: 10, bottom: 10 },
			elevation: 0,
		});
		expect(mapbox.compareViewStateWithTransform(tr as never, { pitch: 30 })).toBe(false);
	});
});
