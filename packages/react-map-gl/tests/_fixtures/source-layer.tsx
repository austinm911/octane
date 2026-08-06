/** @jsxImportSource octane */
import { MapContext } from '../../src/internal/context';
import { Layer, Source } from '../../src/internal/components';

export function SourceLayerHarness(props: {
	map: any;
	data: GeoJSON.FeatureCollection;
	radius: number;
}) {
	return (
		<MapContext.Provider value={{ map: { getMap: () => props.map } as any, mapLib: {} }}>
			<Source id="places" type="geojson" data={props.data}>
				<Layer id="place-points" type="circle" paint={{ 'circle-radius': props.radius }} />
			</Source>
		</MapContext.Provider>
	);
}
