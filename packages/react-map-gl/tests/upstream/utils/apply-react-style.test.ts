import { expect, it } from 'vitest';
import { applyReactStyle } from '../../../src/internal/utils';

it('ports the shared upstream mapbox and maplibre apply-react-style contract', () => {
	const div = document.createElement('div');
	expect(() => applyReactStyle(null, {})).not.toThrow();
	expect(() => applyReactStyle(div, null)).not.toThrow();
	applyReactStyle(div, { marginLeft: 4, height: 24, lineHeight: 2, zIndex: 1, flexGrow: 0.5 });
	expect(div.style.marginLeft).toBe('4px');
	expect(div.style.height).toBe('24px');
	expect(div.style.lineHeight).toBe('2');
	expect(div.style.zIndex).toBe('1');
	expect(div.style.flexGrow).toBe('0.5');
});
