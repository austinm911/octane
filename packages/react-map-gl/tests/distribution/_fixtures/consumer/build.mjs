import { resolve } from 'node:path';
import { octane } from 'octane/compiler/vite';
import { build } from 'vite';

await build({
	root: process.cwd(),
	configFile: false,
	logLevel: 'silent',
	plugins: [octane({ ssr: true, hmr: false })],
	build: {
		ssr: resolve('ssr-entry.ts'),
		outDir: 'dist-ssr',
		emptyOutDir: true,
		minify: false,
	},
});
