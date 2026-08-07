/** @jsxImportSource octane */
import { expect, test } from 'vitest';
import { Popup } from '../../../../src/mapbox';
import { mountInMap, tick } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/popup.spec.jsx
test('Popup', async () => {
	const ref: any = { current: null };
	const { result, map } = mountInMap(Popup, {
		ref,
		longitude: -122,
		latitude: 38,
		offset: [0, 10],
		children: 'You are here',
	});
	await tick();
	expect(map.container.querySelector('.mapboxgl-popup')).toBeTruthy();
	expect(ref.current).toBeTruthy();
	const popup = ref.current,
		offset = popup.options.offset,
		anchor = popup.options.anchor,
		maxWidth = popup.options.maxWidth;
	result.unmount();
	const b = mountInMap(
		Popup,
		{
			ref,
			longitude: -122,
			latitude: 38,
			offset: { top: [0, 0], left: [10, 0] },
			anchor: 'top',
			maxWidth: '100px',
			children: <div id="popup-content">You are here</div>,
		},
		map,
	);
	await tick();
	expect(b.map.container.querySelector('#popup-content')).toBeTruthy();
	expect(ref.current.options.offset).not.toBe(offset);
	expect(ref.current.options.anchor).not.toBe(anchor);
	expect(ref.current.options.maxWidth).not.toBe(maxWidth);
	b.result.unmount();
	const c = mountInMap(Popup, { ref, longitude: -122, latitude: 38, className: 'classA' }, map);
	await tick();
	expect(ref.current._container.classList.contains('classA')).toBe(true);
	c.result.unmount();
});
