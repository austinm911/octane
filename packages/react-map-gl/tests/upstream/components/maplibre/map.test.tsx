/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { MapProvider, useMap } from '@octanejs/react-map-gl/maplibre';
import { MapRoot } from '../../../../src/internal/map-root';
import { act, flushEffects, mount } from '../../../_helpers';
class Controller {
	static instances: Controller[] = [];
	map = {
		center: { lng: 0, lat: 0 },
		zoom: 0,
		getCenter: () => this.map.center,
		getZoom: () => this.map.zoom,
	};
	destroy() {}
	recycle() {}
	constructor(
		_c: any,
		public props: any,
	) {
		Controller.instances.push(this);
		this.apply(props);
		queueMicrotask(() => props.onLoad?.({ target: this.map }));
	}
	apply(p: any) {
		if (p.initialViewState) {
			this.map.center = { lng: p.initialViewState.longitude, lat: p.initialViewState.latitude };
			this.map.zoom = p.initialViewState.zoom;
		}
		if (p.longitude !== undefined) {
			this.map.center = { lng: p.longitude, lat: p.latitude };
			this.map.zoom = p.zoom;
		}
	}
	setProps(p: any) {
		this.props = p;
		this.apply(p);
	}
	static reuse() {
		return null;
	}
}
const engine: any = {
	name: 'maplibre',
	load: async () => lib,
	Controller,
	createRef: (c: Controller) => ({ ...c.map, getMap: () => c.map }),
	childAttributes: {},
};
const lib: any = { Map: class {} };
async function settle() {
	flushEffects();
	await act(async () => {
		await Promise.resolve();
	});
}
function Case(p: any) {
	return <MapRoot {...p} engine={engine} mapLib={lib} />;
}
// Sources: modules/react-maplibre/test/components/map.spec.jsx and use-map.spec.jsx.
test('Map', async () => {
	Controller.instances = [];
	let loads = 0;
	const ref = { current: null as any };
	const r = mount(Case, {
		ref,
		initialViewState: { longitude: -100, latitude: 40, zoom: 4 },
		onLoad: () => loads++,
	});
	await settle();
	expect(ref.current).toBeTruthy();
	expect(ref.current.getCenter().lng).toBe(-100);
	expect(ref.current.getCenter().lat).toBe(40);
	expect(ref.current.getZoom()).toBe(4);
	r.update(Case, { ref, longitude: -122, latitude: 38, zoom: 14, onLoad: () => loads++ });
	expect(ref.current.getCenter().lng).toBe(-122);
	expect(ref.current.getCenter().lat).toBe(38);
	expect(ref.current.getZoom()).toBe(14);
	expect(loads).toBe(1);
	r.unmount();
});
test('Map#uncontrolled', async () => {
	Controller.instances = [];
	const ref = { current: null as any };
	const r = mount(Case, { ref, initialViewState: { longitude: -100, latitude: 40, zoom: 4 } });
	await settle();
	const map = Controller.instances.at(-1)!.map;
	map.center = { lng: -122, lat: 38 };
	map.zoom = 14;
	expect(ref.current.getCenter()).toEqual({ lng: -122, lat: 38 });
	expect(ref.current.getZoom()).toBe(14);
	r.unmount();
});
test('Map#controlled#no-update', async () => {
	const ref = { current: null as any };
	const r = mount(Case, { ref, longitude: -100, latitude: 40, zoom: 4 });
	await settle();
	r.update(Case, { ref, longitude: -100, latitude: 40, zoom: 4 });
	expect(ref.current.getCenter()).toEqual({ lng: -100, lat: 40 });
	r.unmount();
});
test('Map#controlled#mirror-back', async () => {
	const ref = { current: null as any };
	const r = mount(Case, { ref, longitude: -100, latitude: 40, zoom: 4 });
	await settle();
	r.update(Case, { ref, longitude: -122, latitude: 38, zoom: 14 });
	expect(ref.current.getCenter()).toEqual({ lng: -122, lat: 38 });
	r.unmount();
});
test('Map#controlled#delayed-update', async () => {
	const ref = { current: null as any };
	const r = mount(Case, { ref, longitude: -100, latitude: 40, zoom: 4 });
	await settle();
	expect(ref.current.getCenter()).toEqual({ lng: -100, lat: 40 });
	await act(async () => {
		await Promise.resolve();
		r.update(Case, { ref, longitude: -122, latitude: 38, zoom: 14 });
	});
	expect(ref.current.getCenter()).toEqual({ lng: -122, lat: 38 });
	r.unmount();
});
test('useMap', async () => {
	let maps: any;
	function Read() {
		maps = useMap();
		return null;
	}
	function App(p: any) {
		return (
			<MapProvider>
				{p.a ? <MapRoot id="mapA" engine={engine} mapLib={lib} /> : null}
				{p.b ? <MapRoot id="mapB" engine={engine} mapLib={lib} /> : null}
				<Read />
			</MapProvider>
		);
	}
	const r = mount(App, { a: true, b: true });
	await settle();
	expect(maps.mapA).toBeTruthy();
	expect(maps.mapB).toBeTruthy();
	r.update(App, { a: true, b: false });
	await settle();
	expect(maps.mapA).toBeTruthy();
	expect(maps.mapB).toBeFalsy();
	r.update(App, { a: false, b: false });
	await settle();
	expect(maps.mapA).toBeFalsy();
	r.unmount();
});
