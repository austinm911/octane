/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { useMap, MapProvider } from '../../../../src/mapbox';
import { MountedMapsContext } from '../../../../src/internal/context';
import { useContext, useEffect } from 'octane';
import { mount, flushEffects } from '../../../_helpers';
// Source: upstream/modules/react-mapbox/test/components/use-map.spec.jsx
test('useMap', async () => {
	let maps: any;
	function Probe() {
		maps = useMap();
		return null;
	}
	function Registrar(p: any) {
		const c = useContext(MountedMapsContext)!;
		useEffect(() => {
			if (p.add) {
				c.onMapMount(p.map, p.id);
				return () => c.onMapUnmount(p.id);
			}
		}, []);
		return <Probe />;
	}
	const mapA: any = { getMap: () => ({}) },
		mapB: any = { getMap: () => ({}) };
	function App() {
		return (
			<MapProvider>
				<Registrar add id="mapA" map={mapA} />
				<Registrar add id="mapB" map={mapB} />
			</MapProvider>
		);
	}
	const x = mount(App, {});
	flushEffects();
	await new Promise((r) => setTimeout(r, 0));
	flushEffects();
	expect(maps.mapA).toBeTruthy();
	expect(maps.mapB).toBeTruthy();
	x.unmount();
});
