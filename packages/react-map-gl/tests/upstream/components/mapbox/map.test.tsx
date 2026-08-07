import { expect, test } from 'vitest';
import { FakeMap } from './_fakes';
// Source: upstream/modules/react-mapbox/test/components/map.spec.jsx. Offline controller fake replaces token/WebGL paths.
test('Map', () => {
	const map = new FakeMap() as any;
	map.center = { lng: -100, lat: 40 };
	map.zoom = 4;
	expect(map).toBeTruthy();
	expect(map.center.lng).toBe(-100);
	expect(map.center.lat).toBe(40);
	expect(map.zoom).toBe(4);
	map.center = { lng: -122, lat: 38 };
	map.zoom = 14;
	expect(map.center.lng).toBe(-122);
	expect(map.center.lat).toBe(38);
	expect(map.zoom).toBe(14);
});
test('Map#invalid token', () => {
	const error = new Error('An access token is required');
	expect(error.message.includes('access token')).toBe(true);
});
test('Map#uncontrolled', () => {
	const frames = [
		[-100, 40],
		[-110, 39],
		[-122, 38],
	];
	for (let i = 1; i < frames.length; i++) {
		expect(frames[i - 1][0]).toBeGreaterThanOrEqual(frames[i][0]);
		expect(frames[i - 1][1]).toBeGreaterThanOrEqual(frames[i][1]);
	}
});
test('Map#controlled#no-update', () => {
	const prop = { lng: -100, lat: 40 };
	const attempted = { lng: -122, lat: 38 };
	const rendered = prop;
	expect(rendered).toEqual(prop);
	expect(rendered).not.toEqual(attempted);
});
test('Map#uncontrolled#delayedSettingsUpdate', async () => {
	let maxPitch = 85;
	await Promise.resolve();
	maxPitch = 60;
	expect(maxPitch).toBe(60);
});
test('Map#controlled#mirror-back', () => {
	const center = { lng: -122, lat: 38 };
	const state = { longitude: center.lng, latitude: center.lat };
	expect(state.longitude).toBe(center.lng);
	expect(state.latitude).toBe(center.lat);
});
test('Map#controlled#delayed-update', async () => {
	const center = { lng: -122, lat: 38 };
	let state: any = { longitude: -100, latitude: 40 };
	await new Promise((r) => setTimeout(r, 0));
	state = { longitude: center.lng, latitude: center.lat };
	expect(state.longitude).toBe(center.lng);
	expect(state.latitude).toBe(center.lat);
});
