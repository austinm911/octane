/** @jsxImportSource octane */
import { MapContext } from '../../../../src/internal/context';

export class FakeMap {
	style = { _loaded: true };
	sources = new Map<string, any>();
	layers = new Map<string, any>();
	controls = new Set<any>();
	container = document.createElement('div');
	listeners = new Map<string, Set<Function>>();
	getMap() {
		return this;
	}
	hasControl(c: any) {
		return this.controls.has(c);
	}
	addControl(c: any) {
		this.controls.add(c);
		this.container.appendChild(c._container);
		return this;
	}
	removeControl(c: any) {
		this.controls.delete(c);
		c._container.remove();
		return this;
	}
	on(type: string, fn: Function) {
		let s = this.listeners.get(type);
		if (!s) this.listeners.set(type, (s = new Set()));
		s.add(fn);
	}
	off(type: string, fn: Function) {
		this.listeners.get(type)?.delete(fn);
	}
	addSource(id: string, o: any) {
		const source = {
			...o,
			data: o.data,
			setData(data: any) {
				this.data = data;
			},
			async getData() {
				return this.data;
			},
		};
		this.sources.set(id, source);
	}
	getSource(id: string) {
		return this.sources.get(id);
	}
	removeSource(id: string) {
		this.sources.delete(id);
	}
	addLayer(o: any) {
		this.layers.set(o.id, { ...o, visibility: o.layout?.visibility });
	}
	getLayer(id: string) {
		return this.layers.get(id);
	}
	removeLayer(id: string) {
		this.layers.delete(id);
	}
	getStyle() {
		return { layers: [...this.layers.values()] };
	}
	moveLayer() {}
	setPaintProperty() {}
	setFilter() {}
	setLayerZoomRange() {}
	setLayoutProperty(id: string, key: string, value: any) {
		const l = this.layers.get(id);
		l.layout = { ...l.layout, [key]: value };
		if (key === 'visibility') l.visibility = value;
	}
}
class Emitter {
	handlers = new Map<string, Function[]>();
	on(t: string, f: Function) {
		this.handlers.set(t, [...(this.handlers.get(t) || []), f]);
		return this;
	}
	off() {
		return this;
	}
	once(t: string, f: Function) {
		return this.on(t, f);
	}
	fire(t: string) {
		for (const f of this.handlers.get(t) || []) f({ type: t, target: this });
		return this;
	}
}
export class FakeMarker extends Emitter {
	_element = document.createElement('div');
	lngLat = { lng: 0, lat: 0 };
	offset: any = [0, 0];
	draggable = false;
	rotation = 0;
	pitchAlignment = 'auto';
	rotationAlignment = 'auto';
	popup: any = null;
	constructor(public options: any) {
		super();
		this._element.className = 'maplibregl-marker';
	}
	setLngLat(v: number[]) {
		this.lngLat = { lng: v[0], lat: v[1] };
		return this;
	}
	getLngLat() {
		return this.lngLat;
	}
	getElement() {
		return this._element;
	}
	addTo(map: FakeMap) {
		map.container.appendChild(this._element);
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
	}
	isDraggable() {
		return this.draggable;
	}
	setDraggable(v: boolean) {
		this.draggable = v;
	}
	getRotation() {
		return this.rotation;
	}
	setRotation(v: number) {
		this.rotation = v;
	}
	getPitchAlignment() {
		return this.pitchAlignment;
	}
	setPitchAlignment(v: string) {
		this.pitchAlignment = v;
	}
	getRotationAlignment() {
		return this.rotationAlignment;
	}
	setRotationAlignment(v: string) {
		this.rotationAlignment = v;
	}
	getPopup() {
		return this.popup;
	}
	setPopup(v: any) {
		this.popup = v;
	}
	toggleClassName(v: string) {
		this._element.classList.toggle(v);
	}
}
export class FakePopup extends Emitter {
	_container = document.createElement('div');
	content: any;
	lngLat = { lng: 0, lat: 0 };
	open = false;
	options: any;
	constructor(o: any) {
		super();
		this.options = { ...o };
		this._container.className = 'maplibregl-popup';
	}
	setLngLat(v: number[]) {
		this.lngLat = { lng: v[0], lat: v[1] };
		return this;
	}
	getLngLat() {
		return this.lngLat;
	}
	setDOMContent(v: any) {
		this.content = v;
		return this;
	}
	addTo(map: FakeMap) {
		this.open = true;
		this._container.appendChild(this.content);
		map.container.appendChild(this._container);
		this.fire('open');
		return this;
	}
	isOpen() {
		return this.open;
	}
	remove() {
		this.open = false;
		this._container.remove();
	}
	getElement() {
		return this._container;
	}
	setOffset(v: any) {
		this.options.offset = v;
	}
	setMaxWidth(v: any) {
		this.options.maxWidth = v;
	}
	toggleClassName(v: string) {
		this._container.classList.toggle(v);
	}
}
function Control(cls: string) {
	return class {
		_container = document.createElement('div');
		constructor() {
			this._container.className = cls;
		}
		setUnit() {}
		options: any = {};
		on() {
			return this;
		}
	};
}
export const mapLib: any = {
	Marker: FakeMarker,
	Popup: FakePopup,
	AttributionControl: Control('maplibregl-ctrl-attrib'),
	FullscreenControl: Control('maplibregl-ctrl-fullscreen'),
	GeolocateControl: Control('maplibregl-ctrl-geolocate'),
	NavigationControl: Control('maplibregl-ctrl-zoom-in'),
	ScaleControl: Control('maplibregl-ctrl-scale'),
};
export function Harness(props: { map: FakeMap; children: any }) {
	return (
		<MapContext.Provider value={{ map: props.map as any, mapLib }}>
			{props.children}
		</MapContext.Provider>
	);
}
