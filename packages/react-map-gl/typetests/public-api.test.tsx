import type { MapRef as MapboxRef } from '../src/mapbox';
import MapboxMap, {
	Layer as MapboxLayer,
	Marker as MapboxMarker,
	NavigationControl,
	Source as MapboxSource,
} from '../src/mapbox';
import type { MapRef as MaplibreRef } from '../src/maplibre';
import MaplibreMap, { LogoControl, TerrainControl } from '../src/maplibre';

const mapboxRef: { current: MapboxRef | null } = { current: null };
const maplibreRef: { current: MaplibreRef | null } = { current: null };

export function MapboxFixture() {
	return (
		<MapboxMap
			ref={mapboxRef}
			mapboxAccessToken="pk.test"
			initialViewState={{ longitude: -118.4, latitude: 34.05, zoom: 10 }}
		>
			<NavigationControl position="top-right" />
			<MapboxSource
				id="properties"
				type="geojson"
				data={{ type: 'FeatureCollection', features: [] }}
			>
				<MapboxLayer id="points" type="circle" paint={{ 'circle-radius': 4 }} />
			</MapboxSource>
			<MapboxMarker longitude={-118.4} latitude={34.05} draggable />
		</MapboxMap>
	);
}

export function MaplibreFixture() {
	return (
		<MaplibreMap ref={maplibreRef} initialViewState={{ longitude: 0, latitude: 0, zoom: 2 }}>
			<TerrainControl source="terrain" />
			<LogoControl />
		</MaplibreMap>
	);
}
