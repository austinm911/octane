import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LifecycleHarness } from '../_fixtures/lifecycle';
import { MapRoot } from '../../src/internal/map-root';
import { act, flushEffects, mount, nextPaint } from '../_helpers';
import type { ControllerLike, EngineConfig, MapRefLike } from '../../src/internal/types';

class FakeMap {
	controls = new Set<any>();
	addControl = vi.fn((control: any) => this.controls.add(control));
	removeControl = vi.fn((control: any) => this.controls.delete(control));
	hasControl = vi.fn((control: any) => this.controls.has(control));
}

class FakeController implements ControllerLike {
	static instances: FakeController[] = [];
	static reuseResult: FakeController | null = null;
	static reuse = vi.fn(() => FakeController.reuseResult);

	map = new FakeMap();
	setProps = vi.fn();
	recycle = vi.fn();
	destroy = vi.fn();

	constructor(
		public MapClass: new (options: any) => any,
		public props: Record<string, any>,
		public container: HTMLDivElement,
	) {
		FakeController.instances.push(this);
	}
}

function createRef(controller: ControllerLike): MapRefLike {
	const map = controller.map as FakeMap;
	return {
		getMap: () => map,
		addControl: map.addControl,
		removeControl: map.removeControl,
		hasControl: map.hasControl,
	};
}

const mapLib = { Map: class FakeMapConstructor {} };
const engine: EngineConfig = {
	name: 'mapbox',
	load: async () => mapLib,
	Controller: FakeController,
	createRef,
	childAttributes: { 'mapboxgl-children': '' },
};

async function settle(): Promise<void> {
	flushEffects();
	await act(async () => {
		await Promise.resolve();
	});
	await nextPaint();
}

describe('Map lifecycle', () => {
	beforeEach(() => {
		FakeController.instances.length = 0;
		FakeController.reuseResult = null;
		FakeController.reuse.mockClear();
	});

	test('constructs once, publishes the ref and registry entry, updates props, and destroys', async () => {
		const controlEvents: string[] = [];
		const refValue: { current: MapRefLike | null } = { current: null };
		const result = mount(LifecycleHarness, {
			engine,
			mapLib,
			show: true,
			refValue,
			controlEvents,
			value: 1,
		});

		await settle();
		expect(FakeController.instances).toHaveLength(1);
		const controller = FakeController.instances[0];
		expect(result.find('#map-child').textContent).toBe('ready');
		expect(result.find('#registry').textContent).toBe('primary');
		expect(refValue.current?.getMap()).toBe(controller.map);
		expect(controlEvents).toEqual(['add']);

		result.update(LifecycleHarness, {
			engine,
			mapLib,
			show: true,
			refValue,
			controlEvents,
			value: 2,
		});
		expect(controller.setProps).toHaveBeenLastCalledWith(expect.objectContaining({ value: 2 }));

		result.update(LifecycleHarness, {
			engine,
			mapLib,
			show: false,
			refValue,
			controlEvents,
			value: 2,
		});
		await settle();
		expect(controller.destroy).toHaveBeenCalledTimes(1);
		expect(controlEvents).toEqual(['add', 'remove']);
		expect(result.find('#registry').textContent).toBe('none');
		result.unmount();
	});

	test('recycles a reusable map instead of destroying it', async () => {
		const reusable = new FakeController(mapLib.Map, {}, document.createElement('div'));
		FakeController.instances.length = 0;
		FakeController.reuseResult = reusable;
		const result = mount(LifecycleHarness, {
			engine,
			mapLib,
			show: true,
			reuseMaps: true,
			controlEvents: [],
			value: 1,
		});
		await settle();
		expect(FakeController.reuse).toHaveBeenCalledTimes(1);
		expect(FakeController.instances).toHaveLength(0);

		result.unmount();
		flushEffects();
		expect(reusable.recycle).toHaveBeenCalledTimes(1);
		expect(reusable.destroy).not.toHaveBeenCalled();
	});

	test('reports invalid map libraries through onError without constructing', async () => {
		const onError = vi.fn();
		function ErrorHarness() {
			return <MapRoot engine={engine} mapLib={{}} onError={onError} />;
		}
		const result = mount(ErrorHarness);
		await settle();
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', error: expect.any(Error) }),
		);
		expect(FakeController.instances).toHaveLength(0);
		result.unmount();
	});
});
