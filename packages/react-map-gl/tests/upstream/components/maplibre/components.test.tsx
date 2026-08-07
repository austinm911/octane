/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	Layer,
	Marker,
	NavigationControl,
	Popup,
	ScaleControl,
	Source,
} from '@octanejs/react-map-gl/maplibre';
import { flushEffects, mount } from '../../../_helpers';
import { FakeMap, Harness } from './fixtures';
const settle = () => {
	flushEffects();
};
// Ported case-by-case from react-map-gl/modules/react-maplibre/test/components at the pinned upstream revision.
test('Controls', () => {
	const map = new FakeMap();
	const ref = { current: null as any };
	let r = mount(() => (
		<Harness map={map}>
			<AttributionControl />
		</Harness>
	));
	settle();
	expect(map.container.querySelector('.maplibregl-ctrl-attrib')).toBeTruthy();
	r.unmount();
	r = mount(() => (
		<Harness map={map}>
			<FullscreenControl />
		</Harness>
	));
	settle();
	expect(map.container.querySelector('.maplibregl-ctrl-fullscreen')).toBeTruthy();
	r.unmount();
	r = mount(() => (
		<Harness map={map}>
			<GeolocateControl ref={ref} />
		</Harness>
	));
	settle();
	expect(map.container.querySelector('.maplibregl-ctrl-geolocate')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	r.unmount();
	r = mount(() => (
		<Harness map={map}>
			<NavigationControl />
		</Harness>
	));
	settle();
	expect(map.container.querySelector('.maplibregl-ctrl-zoom-in')).toBeTruthy();
	r.unmount();
	r = mount(() => (
		<Harness map={map}>
			<ScaleControl />
		</Harness>
	));
	settle();
	expect(map.container.querySelector('.maplibregl-ctrl-scale')).toBeTruthy();
	r.unmount();
});

test('Marker', () => {
	const map = new FakeMap(),
		ref = { current: null as any };
	function Case(p: any) {
		return (
			<Harness map={map}>
				<Marker ref={ref} longitude={-122} latitude={38} {...p}>
					{p.child}
				</Marker>
			</Harness>
		);
	}
	let r = mount(Case, {});
	settle();
	expect(map.container.querySelector('.maplibregl-marker')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	const marker = ref.current,
		offset = marker.getOffset(),
		draggable = marker.isDraggable(),
		rotation = marker.getRotation(),
		pitch = marker.getPitchAlignment(),
		alignment = marker.getRotationAlignment();
	r.update(Case, { offset: [0, 0] });
	settle();
	expect(marker.getOffset()).toBe(offset);
	let callback = '';
	r.update(Case, {
		offset: [0, 1],
		rotation: 30,
		draggable: true,
		className: 'classA',
		pitchAlignment: 'viewport',
		rotationAlignment: 'viewport',
		onDragStart: () => (callback = 'dragstart'),
		onDrag: () => (callback = 'drag'),
		onDragEnd: () => (callback = 'dragend'),
	});
	settle();
	expect(marker.getOffset()).not.toBe(offset);
	expect(marker.isDraggable()).not.toBe(draggable);
	expect(marker.getRotation()).not.toBe(rotation);
	expect(marker.getPitchAlignment()).not.toBe(pitch);
	expect(marker.getRotationAlignment()).not.toBe(alignment);
	expect(marker._element.classList.contains('classA')).toBe(true);
	marker.fire('dragstart');
	expect(callback).toBe('dragstart');
	marker.fire('drag');
	expect(callback).toBe('drag');
	marker.fire('dragend');
	expect(callback).toBe('dragend');
	r.unmount();
	expect(ref.current).toBeNull();
	r = mount(Case, { child: <div id="marker-content" /> });
	settle();
	expect(map.container.querySelector('#marker-content')).toBeTruthy();
	r.unmount();
});

test('Popup', () => {
	const map = new FakeMap(),
		ref = { current: null as any };
	function Case(p: any) {
		return (
			<Harness map={map}>
				<Popup ref={ref} longitude={-122} latitude={38} {...p}>
					{p.child ?? 'You are here'}
				</Popup>
			</Harness>
		);
	}
	const r = mount(Case, { offset: [0, 10] });
	settle();
	expect(map.container.querySelector('.maplibregl-popup')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	const popup = ref.current,
		{ anchor, offset, maxWidth } = popup.options;
	r.update(Case, { offset: [0, 10], child: <div id="popup-content">You are here</div> });
	settle();
	expect(popup.options.offset).toBe(offset);
	expect(map.container.querySelector('#popup-content')).toBeTruthy();
	r.update(Case, {
		offset: { top: [0, 0], left: [10, 0] },
		anchor: 'top',
		maxWidth: '100px',
		child: <div />,
	});
	settle();
	expect(popup.options.offset).not.toBe(offset);
	expect(popup.options.anchor).not.toBe(anchor);
	expect(popup.options.maxWidth).not.toBe(maxWidth);
	r.update(Case, { className: 'classA', child: <div /> });
	settle();
	expect(popup._container.classList.contains('classA')).toBe(true);
	r.unmount();
});

const point = { type: 'Point', coordinates: [0, 0] } as any;
test('Source/Layer', () => {
	const map = new FakeMap();
	function Case(p: any) {
		return (
			<Harness map={map}>
				{p.show !== false ? <Source id="my-data" type="geojson" data={p.data ?? point} /> : null}
			</Harness>
		);
	}
	const r = mount(Case, {});
	settle();
	expect(map.getSource('my-data')).toBeTruthy();
	const next = { type: 'Point', coordinates: [1, 1] };
	r.update(Case, { data: next });
	settle();
	expect(map.getSource('my-data').data).toEqual(next);
	r.unmount();
	settle();
	expect(map.getSource('my-data')).toBeFalsy();
});

test('Source/Layer', () => {
	const map = new FakeMap();
	const one = { type: 'circle', paint: { 'circle-radius': 10, 'circle-color': '#007cbf' } } as any;
	const two = {
		type: 'circle',
		paint: { 'circle-radius': 10, 'circle-color': '#000' },
		layout: { visibility: 'none' },
	} as any;
	function Case(p: any) {
		return (
			<Harness map={map}>
				{p.show !== false ? (
					<Source id="my-data" type="geojson" data={point}>
						<Layer id="my-layer" {...(p.layer ?? one)} />
					</Source>
				) : null}
			</Harness>
		);
	}
	const r = mount(Case, {});
	settle();
	const layer = map.getLayer('my-layer');
	expect(layer).toBeTruthy();
	r.update(Case, { layer: two });
	settle();
	expect(layer.visibility).toBe('none');
	r.unmount();
	settle();
	expect(map.getSource('my-data')).toBeFalsy();
	expect(map.getLayer('my-layer')).toBeFalsy();
	r.unmount();
});
