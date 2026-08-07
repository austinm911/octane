/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { Source, Layer } from '../../../../src/mapbox';
import { mountInMap, tick } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/layer.spec.jsx
test('Source/Layer', async () => {
	const geoJSON = { type: 'Point', coordinates: [0, 0] };
	function Tree(p: any) {
		return (
			<Source id="my-data" type="geojson" data={geoJSON}>
				<Layer
					id="my-layer"
					type="circle"
					paint={{ 'circle-radius': 10, 'circle-color': p.color }}
					layout={p.hidden ? { visibility: 'none' } : {}}
				/>
			</Source>
		);
	}
	const x = mountInMap(Tree, { color: '#007cbf', hidden: false });
	await tick();
	expect(x.map.getLayer('my-layer')).toBeTruthy();
	x.update({ color: '#000000', hidden: true });
	await tick();
	expect(x.map.getLayer('my-layer').layout.visibility).toBe('none');
	x.result.unmount();
	await tick();
	expect(x.map.getSource('my-data')).toBeFalsy();
	expect(x.map.getLayer('my-layer')).toBeFalsy();
});
