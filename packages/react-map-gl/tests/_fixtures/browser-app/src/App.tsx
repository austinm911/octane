/** @jsxImportSource octane */
import MapboxMap, {
	Layer as MapboxLayer,
	Marker as MapboxMarker,
	NavigationControl as MapboxNavigationControl,
	Popup as MapboxPopup,
	Source as MapboxSource,
} from '@octanejs/react-map-gl/mapbox';
import MapLibreMap, {
	Layer,
	Marker,
	NavigationControl,
	Popup,
	Source,
} from '@octanejs/react-map-gl/maplibre';
import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import { useState } from 'octane';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';

declare const __MAPBOX_TOKEN__: string;

const style = { version: 8 as const, sources: {}, layers: [] };
const point = (longitude: number) => ({
	type: 'FeatureCollection' as const,
	features: [
		{
			type: 'Feature' as const,
			geometry: { type: 'Point' as const, coordinates: [longitude, 0] },
			properties: {},
		},
	],
});

type Proof = {
	loads: number;
	resizes: number;
	clicks: number;
	sourceLongitude: number;
	layerRadius: number;
	reusedMap?: boolean;
	reusedCanvas?: boolean;
};
function record(map: any, event: 'load' | 'resize' | 'click') {
	const root = globalThis as typeof globalThis & {
		__octaneMapProof?: Proof;
		__octaneMap?: any;
		__octaneFirstMap?: any;
		__octaneFirstCanvas?: HTMLCanvasElement;
	};
	root.__octaneMapProof ??= {
		loads: 0,
		resizes: 0,
		clicks: 0,
		sourceLongitude: -1,
		layerRadius: -1,
	};
	root.__octaneMapProof[event === 'load' ? 'loads' : event === 'resize' ? 'resizes' : 'clicks']++;
	if (event === 'load') {
		if (root.__octaneFirstMap) {
			root.__octaneMapProof.reusedMap = root.__octaneFirstMap === map;
			root.__octaneMapProof.reusedCanvas = root.__octaneFirstCanvas === map.getCanvas();
		} else {
			root.__octaneFirstMap = map;
			root.__octaneFirstCanvas = map.getCanvas();
		}
	}
	root.__octaneMap = map;
	document.querySelector('[data-map-app]')?.setAttribute('data-loaded', 'true');
}

function MapLibreApp() {
	const [show, setShow] = useState(true);
	const [wide, setWide] = useState(false);
	const [updated, setUpdated] = useState(false);
	return (
		<main data-map-app="" data-engine="maplibre">
			<button id="toggle-map" onClick={() => setShow((value) => !value)}>
				Toggle map
			</button>
			<button id="resize-map" onClick={() => setWide((value) => !value)}>
				Resize map
			</button>
			<button id="update-style" onClick={() => setUpdated(true)}>
				Update style
			</button>
			{show ? (
				<MapLibreMap
					mapLib={maplibregl}
					reuseMaps
					style={{ width: wide ? 300 : 256, height: 192 }}
					mapStyle={style}
					initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
					attributionControl={false}
					onLoad={(event) => record(event.target, 'load')}
					onResize={(event) => record(event.target, 'resize')}
					onClick={(event) => record(event.target, 'click')}
				>
					<NavigationControl position="top-right" />
					<Source id="proof-source" type="geojson" data={point(updated ? 10 : 0)}>
						<Layer id="proof-layer" type="circle" paint={{ 'circle-radius': updated ? 9 : 6 }} />
					</Source>
					<Marker longitude={0} latitude={0} />
					<Popup longitude={0} latitude={0} closeButton={false}>
						MapLibre popup
					</Popup>
				</MapLibreMap>
			) : null}
		</main>
	);
}

function MapboxApp() {
	return (
		<main data-map-app="" data-engine="mapbox">
			<MapboxMap
				mapLib={mapboxgl}
				mapboxAccessToken={__MAPBOX_TOKEN__}
				style={{ width: 256, height: 192 }}
				mapStyle={__MAPBOX_TOKEN__ ? 'mapbox://styles/mapbox/streets-v12' : style}
				initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
				onLoad={(event) => record(event.target, 'load')}
			>
				<MapboxNavigationControl position="top-right" />
				<MapboxMarker longitude={0} latitude={0} />
				<MapboxPopup longitude={0} latitude={0} closeButton={false}>
					Mapbox popup
				</MapboxPopup>
				<MapboxSource id="proof-source" type="geojson" data={point(0)}>
					<MapboxLayer id="proof-layer" type="circle" paint={{ 'circle-radius': 6 }} />
				</MapboxSource>
			</MapboxMap>
		</main>
	);
}

export function App() {
	return new URLSearchParams(location.search).get('engine') === 'mapbox' ? (
		<MapboxApp />
	) : (
		<MapLibreApp />
	);
}
