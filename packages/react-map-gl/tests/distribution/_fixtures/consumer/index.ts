import Map, {
	type MapProps,
	Marker,
	type MarkerProps,
	useMap,
} from '@octanejs/react-map-gl/maplibre';
import MapboxMap, { type MapProps as MapboxProps } from '@octanejs/react-map-gl/mapbox';
import type { OctaneNode } from 'octane';

const mapProps = { initialViewState: { longitude: 0, latitude: 0, zoom: 1 } } satisfies MapProps;
const markerProps = { longitude: 1, latitude: 2 } satisfies MarkerProps;
const mapNode: OctaneNode = Map(mapProps);
const mapboxProps = {
	initialViewState: { longitude: 0, latitude: 0, zoom: 1 },
} satisfies MapboxProps;
const mapboxNode: OctaneNode = MapboxMap(mapboxProps);
const markerNode: OctaneNode = Marker(markerProps);
const collection = useMap;

export { collection, mapboxNode, mapNode, markerNode };
