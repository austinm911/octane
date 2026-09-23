// Independently authored Octane adapter for the public @blocknote/react 0.53.0 API.
import { useEffect, useState } from 'octane';

import { splitSlot, subSlot } from '../internal';

export type ColorSchemePreference = 'dark' | 'light' | 'no-preference';

const darkQuery = '(prefers-color-scheme: dark)';
const lightQuery = '(prefers-color-scheme: light)';

function readPreference(): ColorSchemePreference {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return 'no-preference';
	}

	if (window.matchMedia(darkQuery).matches) {
		return 'dark';
	}

	return window.matchMedia(lightQuery).matches ? 'light' : 'no-preference';
}

/** Track the system `prefers-color-scheme` media query. */
export function usePrefersColorScheme(): ColorSchemePreference;
export function usePrefersColorScheme(...args: unknown[]): ColorSchemePreference {
	const [, slot] = splitSlot(args);
	const [preference, setPreference] = useState(readPreference, subSlot(slot, 'preference'));

	useEffect(
		() => {
			if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
				return;
			}

			const queries = [window.matchMedia(darkQuery), window.matchMedia(lightQuery)];
			const update = () => setPreference(readPreference());

			for (const query of queries) {
				query.addEventListener('change', update);
			}
			// The preference may have changed between render and subscription.
			update();

			return () => {
				for (const query of queries) {
					query.removeEventListener('change', update);
				}
			};
		},
		[],
		subSlot(slot, 'subscribe'),
	);

	return preference;
}
