import { describe, expect, test } from 'vitest';
import * as mapbox from '../../src/mapbox';
import * as maplibre from '../../src/maplibre';
import * as upstreamMapbox from 'react-map-gl/mapbox';
import * as upstreamMaplibre from 'react-map-gl/maplibre';

const COMMON_EXPORTS = [
	'Map',
	'Marker',
	'Popup',
	'AttributionControl',
	'FullscreenControl',
	'GeolocateControl',
	'NavigationControl',
	'ScaleControl',
	'Source',
	'Layer',
	'useControl',
	'MapProvider',
	'useMap',
];

describe('react-map-gl public runtime exports', () => {
	test('mapbox entry exposes exactly the pinned runtime surface', () => {
		for (const name of COMMON_EXPORTS) expect(mapbox).toHaveProperty(name);
		expect(mapbox.default).toBe(mapbox.Map);
		expect(Object.keys(mapbox).sort()).toEqual(Object.keys(upstreamMapbox).sort());
	});

	test('maplibre entry adds its engine-specific controls', () => {
		for (const name of COMMON_EXPORTS) expect(maplibre).toHaveProperty(name);
		expect(maplibre).toHaveProperty('TerrainControl');
		expect(maplibre).toHaveProperty('LogoControl');
		expect(maplibre.default).toBe(maplibre.Map);
		expect(Object.keys(maplibre).sort()).toEqual(Object.keys(upstreamMaplibre).sort());
	});
});
