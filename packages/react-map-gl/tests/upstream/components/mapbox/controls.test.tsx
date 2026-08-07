/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from '../../../../src/mapbox';
import { mountInMap, tick, FakeMap } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/controls.spec.jsx
test('Controls', async () => {
	const map = new FakeMap();
	for (const [C, selector] of [
		[AttributionControl, '.mapboxgl-ctrl-attrib'],
		[FullscreenControl, '.mapboxgl-ctrl-fullscreen'],
		[NavigationControl, '.mapboxgl-ctrl-zoom-in'],
		[ScaleControl, '.mapboxgl-ctrl-scale'],
	] as any) {
		const x = mountInMap(C, {}, map);
		await tick();
		expect(map.container.querySelector(selector)).toBeTruthy();
		x.result.unmount();
	}
	const ref: any = { current: null };
	const g = mountInMap(GeolocateControl, { ref }, map);
	await tick();
	expect(map.container.querySelector('.mapboxgl-ctrl-geolocate')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	g.result.unmount();
});
