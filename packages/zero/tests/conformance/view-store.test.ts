import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { queryInternalsTag, type QueryImpl } from '@rocicorp/zero/bindings';
import type { ErroredQuery, Query, ResultType, Schema, Zero } from '@rocicorp/zero';
import { ViewStore } from '../../src/use-query.ts';

type Listener = (data: unknown, resultType: ResultType, error?: ErroredQuery) => void;

type MockView = {
	listeners: Set<Listener>;
	addListener(listener: Listener): () => void;
	destroy(): void;
	updateTTL(): void;
};

function createQuery(hash: string): Query<string, Schema> {
	return {
		[queryInternalsTag]: true,
		hash: () => hash,
		format: { singular: false },
	} as unknown as QueryImpl<string, Schema>;
}

function createZero(clientID: string) {
	const materialize = vi.fn(
		() =>
			({
				listeners: new Set<Listener>(),
				addListener(listener: Listener) {
					this.listeners.add(listener);
					return () => this.listeners.delete(listener);
				},
				destroy() {
					this.listeners.clear();
				},
				updateTTL() {},
			}) satisfies MockView,
	);
	return {
		zero: { clientID, materialize } as unknown as Zero<Schema, undefined, unknown>,
		materialize,
	};
}

function emit(
	view: MockView,
	rows: readonly unknown[],
	resultType: ResultType = 'unknown',
	error?: ErroredQuery,
) {
	for (const listener of view.listeners) listener(rows, resultType, error);
}

function materialized(store: ViewStore, hash = 'query') {
	const { zero, materialize } = createZero('client');
	const view = store.getView(zero, createQuery(hash), true, 'forever');
	const unsubscribe = view.subscribeReactInternals(() => {});
	const mock: MockView = materialize.mock.results[0]!.value;
	return { zero, view, mock, unsubscribe };
}

describe('Zero view lifecycle', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	// Adapted from navigation-race.test.tsx at @rocicorp/zero 1.8.0.
	test('preserves a materialized view across a fast unsubscribe and resubscribe', () => {
		const store = new ViewStore();
		const query = createQuery('fast-navigation');
		const { zero, materialize } = createZero('client-fast');
		const first = store.getView(zero, query, true, 'forever');
		const unsubscribe = first.subscribeReactInternals(() => {});
		const materialized = materialize.mock.results[0]!.value;
		emit(materialized, [{ id: '1' }]);

		unsubscribe();
		vi.advanceTimersByTime(5);
		const second = store.getView(zero, query, true, 'forever');
		const unsubscribeAgain = second.subscribeReactInternals(() => {});
		vi.advanceTimersByTime(20);

		expect(second).toBe(first);
		expect(second.getSnapshot()[0]).toEqual([{ id: '1' }]);
		expect(materialize).toHaveBeenCalledTimes(1);
		unsubscribeAgain();
	});

	// Adapted from navigation-race.test.tsx at @rocicorp/zero 1.8.0.
	test('re-materializes after the destruction deadline', () => {
		const store = new ViewStore();
		const query = createQuery('slow-navigation');
		const { zero, materialize } = createZero('client-slow');
		const first = store.getView(zero, query, true, 'forever');
		const unsubscribe = first.subscribeReactInternals(() => {});

		unsubscribe();
		vi.advanceTimersByTime(15);
		const second = store.getView(zero, query, true, 'forever');

		expect(second).not.toBe(first);
		expect(second.getSnapshot()[0]).toEqual([]);
		expect(materialize).toHaveBeenCalledTimes(2);
	});
});

describe('Zero 1.11 result handling', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	// Adapted from use-query.test.tsx at @rocicorp/zero 1.11.0.
	test('an unchanged ttl is not forwarded to the view', () => {
		const store = new ViewStore();
		const { zero, mock } = materialized(store);
		const updateTTL = vi.spyOn(mock, 'updateTTL');
		store.getView(zero, createQuery('query'), true, 'forever');
		expect(updateTTL).not.toHaveBeenCalled();
		store.getView(zero, createQuery('query'), true, '2s');
		expect(updateTTL).toHaveBeenCalledWith('2s');
	});

	// Adapted from use-query.test.tsx at @rocicorp/zero 1.11.0.
	test('empty cached snapshots are stable and satisfy nonEmpty but not complete', () => {
		const store = new ViewStore();
		const { view, mock } = materialized(store);
		emit(mock, [], 'cached');
		const first = view.getSnapshot();
		expect(first).toEqual([[], { type: 'cached' }]);
		emit(mock, [], 'cached');
		expect(view.getSnapshot()).toBe(first);
		expect(view.nonEmpty).toBe(true);
		expect(view.complete).toBe(false);
		emit(mock, [{ id: '1' }], 'complete');
		expect(view.complete).toBe(true);
	});

	// Adapted from use-query.test.tsx at @rocicorp/zero 1.11.0.
	test('a revoked empty cached result suspends again', async () => {
		const store = new ViewStore();
		const { view, mock } = materialized(store);
		emit(mock, [], 'cached');
		emit(mock, [], 'unknown');
		expect(view.nonEmpty).toBe(false);
		let resolved = false;
		void view.waitForNonEmpty().then(() => {
			resolved = true;
		});
		await Promise.resolve();
		expect(resolved).toBe(false);
		emit(mock, [{ id: '1' }], 'unknown');
		await Promise.resolve();
		expect(resolved).toBe(true);
	});

	// Adapted from use-query.test.tsx at @rocicorp/zero 1.11.0.
	test('the same data reference keeps snapshot identity and does not notify', () => {
		const store = new ViewStore();
		const { zero, materialize } = createZero('client');
		const view = store.getView(zero, createQuery('query'), true, 'forever');
		const notify = vi.fn();
		const unsubscribe = view.subscribeReactInternals(notify);
		const mock: MockView = materialize.mock.results[0]!.value;
		const rows = [{ id: '1' }];
		emit(mock, rows);
		const first = view.getSnapshot();
		emit(mock, rows);
		expect(view.getSnapshot()).toBe(first);
		expect(notify).toHaveBeenCalledTimes(1);
		emit(mock, rows, 'complete');
		expect(view.getSnapshot()).not.toBe(first);
		expect(notify).toHaveBeenCalledTimes(2);
		unsubscribe();
	});
});
