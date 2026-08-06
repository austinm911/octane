import { describe, expect, it, vi } from 'vitest';
import { MarkerHarness, PopupHarness } from '../_fixtures/overlays';
import { flushEffects, mount } from '../_helpers';

class FakeMarker {
	static constructorOptions: Record<string, any>[] = [];
	private element = document.createElement('div');
	private lngLat = { lng: 0, lat: 0 };
	constructor(options: Record<string, any>) {
		FakeMarker.constructorOptions.push(options);
	}
	setLngLat([lng, lat]: number[]) {
		this.lngLat = { lng, lat };
		return this;
	}
	getLngLat() {
		return this.lngLat;
	}
	getElement() {
		return this.element;
	}
	on() {
		return this;
	}
	addTo() {
		return this;
	}
	remove() {}
	getOffset() {
		return [0, 0];
	}
	isDraggable() {
		return false;
	}
	getRotation() {
		return 0;
	}
	getRotationAlignment() {
		return 'auto';
	}
	getPitchAlignment() {
		return 'auto';
	}
	getPopup() {
		return null;
	}
	toggleClassName() {}
}

class FakePopup {
	static instances: FakePopup[] = [];
	options: Record<string, any>;
	setMaxWidth = vi.fn();
	setOffset = vi.fn();
	private element = document.createElement('div');
	private lngLat = { lng: 0, lat: 0 };
	constructor(options: Record<string, any>) {
		this.options = { ...options };
		FakePopup.instances.push(this);
	}
	setLngLat([lng, lat]: number[]) {
		this.lngLat = { lng, lat };
		return this;
	}
	getLngLat() {
		return this.lngLat;
	}
	setDOMContent() {
		return this;
	}
	addTo() {
		return this;
	}
	on() {
		return this;
	}
	off() {
		return this;
	}
	once() {
		return this;
	}
	isOpen() {
		return true;
	}
	getElement() {
		return this.element;
	}
	toggleClassName() {}
	remove() {}
}

const map = {};

// Adapted from modules/react-mapbox/test/components/marker.spec.jsx and popup.spec.jsx.
describe('Marker and Popup upstream behavior', () => {
	it('lets the engine create the default childless Marker element', () => {
		FakeMarker.constructorOptions.length = 0;
		const result = mount(MarkerHarness, { map, mapLib: { Marker: FakeMarker } });
		flushEffects();

		expect(FakeMarker.constructorOptions).toHaveLength(1);
		expect(FakeMarker.constructorOptions[0].element).toBeUndefined();
		result.unmount();
	});

	it('updates an open Popup anchor without requiring an offset change', () => {
		FakePopup.instances.length = 0;
		const mapLib = { Popup: FakePopup };
		const result = mount(PopupHarness, { map, mapLib, anchor: 'bottom', maxWidth: '240px' });
		flushEffects();
		const popup = FakePopup.instances[0];

		result.update(PopupHarness, { map, mapLib, anchor: 'top', maxWidth: '240px' });
		expect(popup.options.anchor).toBe('top');
		expect(popup.setMaxWidth).toHaveBeenLastCalledWith('240px');
		result.unmount();
	});
});
