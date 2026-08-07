/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { Source } from '../../../../src/mapbox';
import { mountInMap, tick } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/source.spec.jsx
test('Source/Layer', async () => {
	const a = { type: 'Point', coordinates: [0, 0] },
		b = { type: 'Point', coordinates: [1, 1] };
	const x = mountInMap(Source, { id: 'my-data', type: 'geojson', data: a });
	await tick();
	expect(x.map.getSource('my-data')).toBeTruthy();
	x.update({ id: 'my-data', type: 'geojson', data: b });
	await tick();
	expect(x.map.getSource('my-data')._data).toEqual(b);
	x.result.unmount();
	await tick();
	expect(x.map.getSource('my-data')).toBeFalsy();
});
