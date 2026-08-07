import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MapLibreMap, {
	Layer as LibreLayer,
	Marker as LibreMarker,
	NavigationControl as LibreControl,
	Popup as LibrePopup,
	Source as LibreSource,
	useMap as useLibreMap,
} from 'react-map-gl/maplibre';
import MapboxMap, {
	Layer as BoxLayer,
	Marker as BoxMarker,
	NavigationControl as BoxControl,
	Popup as BoxPopup,
	Source as BoxSource,
	useMap as useBoxMap,
} from 'react-map-gl/mapbox';
import maplibregl from 'maplibre-gl';
import mapboxgl from 'mapbox-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const blankStyle = { version: 8 as const, sources: {}, layers: [] };
const data = (x: number) => ({
	type: 'FeatureCollection' as const,
	features: [
		{
			type: 'Feature' as const,
			properties: {},
			geometry: { type: 'Point' as const, coordinates: [x, 0] },
		},
	],
});
const params = new URLSearchParams(location.search);
const engine = params.get('engine') === 'mapbox' ? 'mapbox' : 'maplibre';
const testCase = params.get('case') || 'Map';
const proof: any = ((globalThis as any).__reactMapGLProof = {
	engine,
	case: testCase,
	loads: 0,
	clicks: 0,
	errors: 0,
});

function MapChild({ box }: { box: boolean }) {
	const maps = box ? useBoxMap() : useLibreMap();
	React.useEffect(() => {
		proof.context = Boolean(maps.current);
	});
	return null;
}
function App() {
	const box = engine === 'mapbox';
	const Map = box ? MapboxMap : MapLibreMap;
	const Source = box ? BoxSource : LibreSource;
	const Layer = box ? BoxLayer : LibreLayer;
	const Marker = box ? BoxMarker : LibreMarker;
	const Popup = box ? BoxPopup : LibrePopup;
	const Control = box ? BoxControl : LibreControl;
	const [longitude, setLongitude] = useState(0);
	const [sourceX, setSourceX] = useState(0);
	const mapRef = useRef<any>(null);
	const controlled = testCase.includes('controlled');
	const delayed = testCase.includes('delayed');
	const mirror = testCase.includes('mirror-back');
	const viewProps: any = controlled
		? { longitude, latitude: 0, zoom: 1 }
		: { initialViewState: { longitude: 0, latitude: 0, zoom: 1 } };
	const onMove = controlled
		? (e: any) => {
				proof.moves = (proof.moves || 0) + 1;
				if (mirror) setLongitude(e.viewState.longitude);
			}
		: undefined;
	return (
		<main data-ready={proof.loads ? 'true' : 'false'} data-engine={engine} data-case={testCase}>
			<button
				id="update"
				onClick={() => {
					setSourceX(12);
					setLongitude(15);
					if (delayed) setTimeout(() => setLongitude(20), 20);
				}}
			>
				update
			</button>
			<button id="move" onClick={() => mapRef.current?.flyTo({ center: [8, 0], duration: 0 })}>
				move
			</button>
			<Map
				ref={mapRef}
				mapLib={box ? mapboxgl : maplibregl}
				{...viewProps}
				onMove={onMove}
				mapboxAccessToken={testCase === 'Map#invalid token' ? 'invalid' : undefined}
				style={{ width: 320, height: 220 }}
				mapStyle={blankStyle}
				attributionControl={false}
				onLoad={(e: any) => {
					proof.loads++;
					proof.map = e.target;
					document.querySelector('main')?.setAttribute('data-ready', 'true');
				}}
				onError={() => {
					proof.errors++;
				}}
				onClick={() => {
					proof.clicks++;
				}}
			>
				<MapChild box={box} />
				<Control position="top-right" />
				<Marker longitude={0} latitude={0} data-testid="marker" />
				<Popup longitude={0} latitude={0} closeButton={false}>
					oracle popup
				</Popup>
				<Source id="oracle-source" type="geojson" data={data(sourceX)}>
					<Layer id="oracle-layer" type="circle" paint={{ 'circle-radius': sourceX ? 9 : 5 }} />
				</Source>
			</Map>
		</main>
	);
}
createRoot(document.getElementById('root')!).render(<App />);
