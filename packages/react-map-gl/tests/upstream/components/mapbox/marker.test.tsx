/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { Marker } from '../../../../src/mapbox';
import { mountInMap, tick, FakeMarker } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/marker.spec.jsx
test('Marker', async () => {
	let ref: any = { current: null };
	let callbackType = '';
	const { result, map } = mountInMap(Marker, { ref, longitude: -122, latitude: 38 });
	await tick();
	expect(map.container.querySelector('.mapboxgl-marker')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	const marker = ref.current as FakeMarker;
	const offset = marker.getOffset(),
		draggable = marker.isDraggable(),
		rotation = marker.getRotation(),
		pitch = marker.getPitchAlignment(),
		rotationA = marker.getRotationAlignment();
	result.unmount();
	const x = mountInMap(
		Marker,
		{
			ref,
			longitude: -122,
			latitude: 38,
			offset: [0, 1],
			rotation: 30,
			draggable: true,
			className: 'classA',
			pitchAlignment: 'map',
			rotationAlignment: 'map',
			onDragStart: () => (callbackType = 'dragstart'),
			onDrag: () => (callbackType = 'drag'),
			onDragEnd: () => (callbackType = 'dragend'),
		},
		map,
	);
	await tick();
	const m = ref.current;
	expect(m.getOffset()).not.toBe(offset);
	expect(m.isDraggable()).not.toBe(draggable);
	expect(m.getRotation()).not.toBe(rotation);
	expect(m.getPitchAlignment()).not.toBe(pitch);
	expect(m.getRotationAlignment()).not.toBe(rotationA);
	expect(m._element.classList.contains('classA')).toBe(true);
	m.fire('dragstart');
	expect(callbackType).toBe('dragstart');
	m.fire('drag');
	expect(callbackType).toBe('drag');
	m.fire('dragend');
	expect(callbackType).toBe('dragend');
	x.result.unmount();
	expect(ref.current).toBeNull();
	const y = mountInMap(
		Marker,
		{ ref, longitude: -100, latitude: 40, children: <div id="marker-content" /> },
		map,
	);
	await tick();
	expect(map.container.querySelector('#marker-content')).toBeTruthy();
	y.result.unmount();
});
