import { describe, expect, it } from 'vitest';
import { validateTestDisposition } from '../../scripts/test-disposition-lib.mjs';

const discovered = ['a.spec.js', 'b.test.ts'];
const complete = [
	{ path: 'a.spec.js', disposition: 'pending-adaptation', reason: 'Needs an Octane fixture.' },
	{
		path: 'b.test.ts',
		disposition: 'run-unchanged',
		reason: 'Framework-neutral suite.',
		evidence: 'tests/b.test.ts',
	},
];

describe('upstream test disposition negative controls', () => {
	it('accepts a complete classified inventory', () => {
		expect(() => validateTestDisposition(discovered, complete)).not.toThrow();
	});

	it('rejects missing, stale, and duplicate artifacts', () => {
		expect(() => validateTestDisposition(discovered, complete.slice(1))).toThrow(
			/Missing: a\.spec\.js/,
		);
		expect(() =>
			validateTestDisposition(discovered, [
				...complete,
				{ path: 'stale.spec.js', disposition: 'pending-harness', reason: 'Stale.' },
			]),
		).toThrow(/stale: stale\.spec\.js/);
		expect(() => validateTestDisposition(discovered, [...complete, complete[0]])).toThrow(
			/Duplicate/,
		);
	});

	it('rejects unclassified artifacts and empty reasons', () => {
		expect(() =>
			validateTestDisposition(discovered, [complete[0], { ...complete[1], disposition: 'todo' }]),
		).toThrow(/Invalid disposition/);
		expect(() =>
			validateTestDisposition(discovered, [complete[0], { ...complete[1], reason: '' }]),
		).toThrow(/Missing disposition reason/);
	});
});
