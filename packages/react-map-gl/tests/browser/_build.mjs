import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { octane } from '@octanejs/vite-plugin';
import { build } from 'vite';
import { createStagingRoot, stageFixture } from './_stage-fixture.mjs';

const fixtureRoot = fileURLToPath(new URL('../_fixtures/browser-app', import.meta.url));
const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const appRoot = stageFixture(
	fixtureRoot,
	process.argv[2] ?? createStagingRoot('maplibre-browser'),
	{
		dependencies: packageRoot,
		link: { '@octanejs/react-map-gl': packageRoot },
	},
);
const outDir = resolve(appRoot, 'dist');
await build({
	root: appRoot,
	configFile: false,
	logLevel: 'silent',
	plugins: [octane({ hmr: false })],
	define: { __MAPBOX_TOKEN__: JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN ?? '') },
	build: { outDir, emptyOutDir: true, minify: false },
});
console.log(
	'__OCTANE_MAPLIBRE_BUILD__' +
		JSON.stringify({ appRoot, outDir, hasMapboxToken: Boolean(process.env.MAPBOX_ACCESS_TOKEN) }),
);
