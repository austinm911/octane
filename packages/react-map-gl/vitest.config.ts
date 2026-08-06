import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { octane } from '../octane/src/compiler/vite.js';

export default defineConfig({
	plugins: [octane()],
	test: {
		name: 'react-map-gl',
		include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
		environment: 'jsdom',
		globals: false,
	},
	resolve: {
		alias: [
			{
				find: /^@octanejs\/react-map-gl\/mapbox$/,
				replacement: resolve(import.meta.dirname, 'src/mapbox.tsx'),
			},
			{
				find: /^@octanejs\/react-map-gl\/maplibre$/,
				replacement: resolve(import.meta.dirname, 'src/maplibre.tsx'),
			},
			{
				find: /^@octanejs\/react-map-gl\/mapbox-legacy$/,
				replacement: resolve(import.meta.dirname, 'src/mapbox-legacy.tsx'),
			},
		],
	},
});
