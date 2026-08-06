/** @jsxImportSource octane */
import MapboxMap from '../../../src/mapbox';
import MaplibreMap from '../../../src/maplibre';

const serverOnlyMapLib = Object.defineProperty({}, 'Map', {
	get(): never {
		throw new Error('The map engine was accessed during server rendering');
	},
});

export function MapboxServerFixture() {
	return (
		<MapboxMap
			id="mapbox-server-map"
			mapLib={serverOnlyMapLib as never}
			initialViewState={{ longitude: -118.4, latitude: 34.05, zoom: 10 }}
			style={{ minHeight: 320 }}
		/>
	);
}

export function MaplibreServerFixture() {
	return (
		<MaplibreMap
			id="maplibre-server-map"
			mapLib={serverOnlyMapLib as never}
			initialViewState={{ longitude: 0, latitude: 0, zoom: 2 }}
			style={{ minHeight: 240 }}
		/>
	);
}
