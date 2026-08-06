/** @jsxImportSource octane */
import Map, { Layer, Marker, NavigationControl, Source } from '@octanejs/react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useState } from 'octane';
import 'maplibre-gl/dist/maplibre-gl.css';

const style = { version: 8 as const, sources: {}, layers: [] };
const data = {
	type: 'FeatureCollection' as const,
	features: [
		{
			type: 'Feature' as const,
			geometry: { type: 'Point' as const, coordinates: [0, 0] },
			properties: {},
		},
	],
};

export function App() {
	const [show, setShow] = useState(true);
	const onLoad = () => {
		const proof = globalThis as typeof globalThis & {
			__octaneMapLibreProof?: { loads: number; canvases: number };
		};
		proof.__octaneMapLibreProof = {
			loads: (proof.__octaneMapLibreProof?.loads ?? 0) + 1,
			canvases: document.querySelectorAll('.maplibregl-canvas').length,
		};
		document.querySelector('[data-maplibre-app]')?.setAttribute('data-loaded', 'true');
	};

	return (
		<main data-maplibre-app="">
			<button id="toggle-map" onClick={() => setShow((value) => !value)}>
				Toggle map
			</button>
			{show ? (
				<Map
					mapLib={maplibregl}
					style={{ width: 256, height: 192 }}
					mapStyle={style}
					initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
					attributionControl={false}
					onLoad={onLoad}
				>
					<NavigationControl position="top-right" />
					<Source id="proof-source" type="geojson" data={data}>
						<Layer id="proof-layer" type="circle" paint={{ 'circle-radius': 6 }} />
					</Source>
					<Marker longitude={0} latitude={0} />
				</Map>
			) : null}
		</main>
	);
}
