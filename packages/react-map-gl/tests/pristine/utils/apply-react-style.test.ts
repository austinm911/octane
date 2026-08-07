import { describe, expect, it } from 'vitest';
import { applyReactStyle as mapbox } from '../../../upstream/modules/react-mapbox/src/utils/apply-react-style';
import { applyReactStyle as maplibre } from '../../../upstream/modules/react-maplibre/src/utils/apply-react-style';

for (const [engine, applyReactStyle] of Object.entries({ mapbox, maplibre })) {
	describe(`${engine}: pristine upstream apply-react-style utility`, () => {
		it('applies numeric DOM style values with React unit semantics', () => {
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
	});
}
