import { describe, expect, it } from 'vitest';
import { validateTypeParity } from '../../scripts/type-parity-lib.mjs';

const pristine = `// TYPE-PARITY: public
import x from 'react-map-gl/mapbox';
// TYPE-PARITY: rejected
// @ts-expect-error invalid
x('bad');
`;
const adapted = pristine.replace("from 'react-map-gl/mapbox'", "from '../src/mapbox'");

describe('type parity inventory negative controls', () => {
	it('accepts only the permitted import transformation', () => {
		expect(validateTypeParity(pristine, adapted).groups).toEqual(['public', 'rejected']);
	});
	it('rejects removed groups, rejection assertions, and unrelated source drift', () => {
		expect(() =>
			validateTypeParity(pristine, adapted.replace('// TYPE-PARITY: public\n', '')),
		).toThrow(/group drift/);
		expect(() =>
			validateTypeParity(pristine, adapted.replace('@ts-expect-error', 'expect-error')),
		).toThrow(/rejection assertion drift/);
		expect(() => validateTypeParity(pristine, adapted.replace("x('bad')", "x('good')"))).toThrow(
			/outside permitted/,
		);
	});
});
