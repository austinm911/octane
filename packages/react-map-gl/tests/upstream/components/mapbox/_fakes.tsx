/** @jsxImportSource octane */
import { MapContext } from '../../../../src/internal/context';
import { mount, flushEffects } from '../../../_helpers';
export { flushEffects };

export const tick = async () => {
	flushEffects();
	await new Promise((r) => setTimeout(r, 5));
	flushEffects();
};
export class Emitter {
	listeners = new Map<string, Function[]>();
	on(n: string, f: Function) {
		this.listeners.set(n, [...(this.listeners.get(n) || []), f]);
		return this;
	}
	off(n: string, f: Function) {
		this.listeners.set(
			n,
			(this.listeners.get(n) || []).filter((x) => x !== f),
		);
		return this;
	}
	once(n: string, f: Function) {
		return this.on(n, f);
	}
	fire(n: string, e: any = {}) {
		for (const f of this.listeners.get(n) || []) f({ ...e, type: n, target: this });
		return this;
	}
}
export class FakeMarker extends Emitter {
	_element: HTMLElement;
	ll = { lng: 0, lat: 0 };
	offset: any = [0, 0];
	draggable = false;
	rotation = 0;
	pitch = 'auto';
	rotationA = 'auto';
	popup: any = null;
	constructor(o: any = {}) {
		super();
		this._element = o.element || document.createElement('div');
		this._element.classList.add('mapboxgl-marker');
		for (const c of (o.className || '').split(' ')) if (c) this._element.classList.add(c);
	}
	setLngLat(v: any) {
		this.ll = { lng: v[0], lat: v[1] };
		return this;
	}
	getLngLat() {
		return this.ll;
	}
	getElement() {
		return this._element;
	}
	addTo(m: any) {
		m.container.appendChild(this._element);
		return this;
	}
	remove() {
		this._element.remove();
	}
	getOffset() {
		return this.offset;
	}
	setOffset(v: any) {
		this.offset = v;
		return this;
	}
	isDraggable() {
		return this.draggable;
	}
	setDraggable(v: boolean) {
		this.draggable = v;
		return this;
	}
	getRotation() {
		return this.rotation;
	}
	setRotation(v: number) {
		this.rotation = v;
		return this;
	}
	getPitchAlignment() {
		return this.pitch;
	}
	setPitchAlignment(v: string) {
		this.pitch = v;
		return this;
	}
	getRotationAlignment() {
		return this.rotationA;
	}
	setRotationAlignment(v: string) {
		this.rotationA = v;
		return this;
	}
	getPopup() {
		return this.popup;
	}
	setPopup(v: any) {
		this.popup = v;
		return this;
	}
	toggleClassName(v: string) {
		this._element.classList.toggle(v);
	}
}
export class FakePopup extends Emitter {
	options: any;
	_container = document.createElement('div');
	content: any;
	ll = { lng: 0, lat: 0 };
	open = false;
	constructor(o: any = {}) {
		super();
		this.options = { ...o };
		this._container.classList.add('mapboxgl-popup');
		for (const c of (o.className || '').split(' ')) if (c) this._container.classList.add(c);
	}
	setLngLat(v: any) {
		this.ll = { lng: v[0], lat: v[1] };
		return this;
	}
	getLngLat() {
		return this.ll;
	}
	setDOMContent(v: any) {
		this.content = v;
		this._container.appendChild(v);
		return this;
	}
	addTo(m: any) {
		this.open = true;
		m.container.appendChild(this._container);
		this.fire('open');
		return this;
	}
	isOpen() {
		return this.open;
	}
	getElement() {
		return this._container;
	}
	setOffset(v: any) {
		this.options.offset = v;
		return this;
	}
	setMaxWidth(v: any) {
		this.options.maxWidth = v;
		return this;
	}
	toggleClassName(v: string) {
		this._container.classList.toggle(v);
	}
	remove() {
		this.open = false;
		this._container.remove();
	}
}
class Control {
	_container = document.createElement('div');
	constructor(public options: any = {}) {}
	onAdd() {
		return this._container;
	}
}
export class AttributionControl extends Control {
	constructor(o: any) {
		super(o);
		this._container.className = 'mapboxgl-ctrl-attrib';
	}
}
export class FullscreenControl extends Control {
	constructor(o: any) {
		super(o);
		this._container.className = 'mapboxgl-ctrl-fullscreen';
	}
}
export class GeolocateControl extends Emitter {
	_container = document.createElement('div');
	constructor(public options: any) {
		super();
		this._container.className = 'mapboxgl-ctrl-geolocate';
	}
}
export class NavigationControl extends Control {
	constructor(o: any) {
		super(o);
		this._container.className = 'mapboxgl-ctrl-zoom-in';
	}
}
export class ScaleControl extends Control {
	constructor(o: any) {
		super(o);
		this._container.className = 'mapboxgl-ctrl-scale';
	}
	setUnit(v: any) {
		this.options.unit = v;
	}
}
export class FakeMap extends Emitter {
	container = document.createElement('div');
	style: any = { _loaded: true };
	sources: any = {};
	layers: any = {};
	controls = new Set<any>();
	getMap() {
		return this;
	}
	addControl(c: any) {
		this.controls.add(c);
		this.container.appendChild(c._container);
		return this;
	}
	removeControl(c: any) {
		this.controls.delete(c);
		c._container.remove();
	}
	hasControl(c: any) {
		return this.controls.has(c);
	}
	addSource(id: string, o: any) {
		this.sources[id] = { ...o, _data: o.data, setData: (d: any) => (this.sources[id]._data = d) };
	}
	getSource(id: string) {
		return this.sources[id];
	}
	removeSource(id: string) {
		delete this.sources[id];
	}
	addLayer(o: any) {
		this.layers[o.id] = { ...o };
	}
	getLayer(id: string) {
		return this.layers[id];
	}
	removeLayer(id: string) {
		delete this.layers[id];
	}
	getStyle() {
		return { layers: Object.values(this.layers) };
	}
	setLayoutProperty(id: string, k: string, v: any) {
		(this.layers[id].layout ??= {})[k] = v;
	}
	setPaintProperty(id: string, k: string, v: any) {
		(this.layers[id].paint ??= {})[k] = v;
	}
	setFilter() {}
	setLayerZoomRange() {}
	moveLayer() {}
}
export const mapLib = {
	Marker: FakeMarker,
	Popup: FakePopup,
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
};
export function mountInMap(Component: any, props: any, map = new FakeMap()) {
	function Harness(p: any) {
		return (
			<MapContext.Provider value={{ map: map as any, mapLib }}>
				<Component {...p} />
			</MapContext.Provider>
		);
	}
	const result = mount(Harness, props);
	map.container.append(...Array.from(result.container.childNodes));
	return { result, map, update: (next: any) => result.update(Harness, next) };
}
