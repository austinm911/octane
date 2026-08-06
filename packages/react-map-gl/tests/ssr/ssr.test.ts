import { renderToString } from 'octane/server';
import { describe, expect, it } from 'vitest';
import { MapboxServerFixture, MaplibreServerFixture } from './_fixtures/server';

describe('@octanejs/react-map-gl server rendering', () => {
	it('renders the Mapbox container without accessing the WebGL engine', () => {
		expect(typeof document).toBe('undefined');
		const { html } = renderToString(MapboxServerFixture, {});

		expect(html).toContain('id="mapbox-server-map"');
		expect(html).toContain('position:relative');
		expect(html).toContain('min-height:320px');
		expect(html).not.toContain('mapboxgl-canvas');
	});

	it('renders the MapLibre container without accessing the WebGL engine', () => {
		expect(typeof document).toBe('undefined');
		const { html } = renderToString(MaplibreServerFixture, {});

		expect(html).toContain('id="maplibre-server-map"');
		expect(html).toContain('min-height:240px');
		expect(html).not.toContain('maplibregl-canvas');
	});
});
