// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { chromium, type Browser, type Page } from 'playwright';
import { stageFixture } from '../../browser/_stage-fixture.mjs';

const packageRoot = resolve(import.meta.dirname, '../../..');
const fixtureRoot = resolve(import.meta.dirname, '../../_fixtures/react-browser-app');
const stagedRoot = realpathSync(mkdtempSync(join(tmpdir(), 'react-map-gl-pristine-')));
let browser: Browser;
let server: Server;
let origin: string;

function serve(root: string) {
	return createServer((req, res) => {
		const url = new URL(req.url || '/', 'http://x');
		const name = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
		const file = resolve(root, `.${name}`);
		if (relative(root, file).startsWith('..') || !existsSync(file) || !statSync(file).isFile()) {
			res.writeHead(404).end();
			return;
		}
		const mime: Record<string, string> = {
			'.html': 'text/html',
			'.js': 'text/javascript',
			'.css': 'text/css',
			'.woff2': 'font/woff2',
		};
		res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
		res.end(readFileSync(file));
	});
}
beforeAll(async () => {
	const oracle = resolve(packageRoot, 'node_modules/react-map-gl');
	stageFixture(fixtureRoot, stagedRoot, {
		dependencies: packageRoot,
		link: {
			react: resolve(packageRoot, 'node_modules/react'),
			'react-map-gl': oracle,
			'react-dom': resolve(realpathSync(oracle), '../react-dom'),
		},
	});
	const outDir = resolve(stagedRoot, 'dist');
	await build({
		root: stagedRoot,
		configFile: false,
		logLevel: 'silent',
		build: { outDir, emptyOutDir: true, minify: false },
	});
	server = serve(outDir);
	await new Promise<void>((ok, fail) => {
		server.once('error', fail);
		server.listen(0, '127.0.0.1', () => ok());
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('fixture server failed');
	origin = `http://127.0.0.1:${address.port}`;
	browser = await chromium.launch({
		headless: true,
		args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
	});
}, 120_000);
afterAll(async () => {
	await browser?.close();
	if (server) await new Promise<void>((ok) => server.close(() => ok()));
	rmSync(stagedRoot, { recursive: true, force: true });
}, 30_000);

async function run(engine: 'maplibre' | 'mapbox', name: string) {
	const page: Page = await browser.newPage({ viewport: { width: 400, height: 300 } });
	const errors: string[] = [];
	const listener = (e: Error) => errors.push(`pageerror: ${String(e)}`);
	const consoleListener = (m: any) => {
		if (m.type() === 'error') errors.push(`console: ${m.text()}`);
	};
	page.on('pageerror', listener);
	page.on('console', consoleListener);
	try {
		await page.goto(`${origin}/?engine=${engine}&case=${encodeURIComponent(name)}`);
		try {
			await page.locator('main[data-ready="true"]').waitFor({ timeout: 8_000 });
		} catch (error) {
			throw new Error(`${String(error)}\n${errors.join('\n')}\n${await page.content()}`);
		}
		const prefix = engine === 'mapbox' ? 'mapboxgl' : 'maplibregl';
		await page.locator(`.${prefix}-canvas`).waitFor();
		const baseline = await page.evaluate(() => {
			const p = (globalThis as any).__reactMapGLProof;
			return {
				loads: p.loads,
				context: p.context,
				source: Boolean(p.map.getSource('oracle-source')),
				layer: Boolean(p.map.getLayer('oracle-layer')),
				center: p.map.getCenter().lng,
			};
		});
		expect(baseline).toMatchObject({ loads: 1, context: true, source: true, layer: true });
		if (name === 'Controls') expect(await page.locator(`.${prefix}-ctrl-zoom-in`).count()).toBe(1);
		if (name === 'Marker')
			expect(await page.locator(`.${prefix}-marker`).count()).toBeGreaterThan(0);
		if (name === 'Popup')
			expect(await page.locator(`.${prefix}-popup`).getByText('oracle popup').count()).toBe(1);
		if (name === 'Source/Layer') {
			await page.locator('#update').click();
			await expect
				.poll(() =>
					page.evaluate(() =>
						(globalThis as any).__reactMapGLProof.map.getPaintProperty(
							'oracle-layer',
							'circle-radius',
						),
					),
				)
				.toBe(9);
		}
		if (name === 'useMap') expect(baseline.context).toBe(true);
		if (name.includes('controlled')) {
			await page.locator('#update').click();
			const expected = name.includes('delayed') ? 20 : 15;
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__reactMapGLProof.map.getCenter().lng))
				.toBeCloseTo(expected, 3);
		} else if (name.includes('delayedSettingsUpdate')) {
			await page.locator('#update').click();
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__reactMapGLProof.map.getCenter().lng))
				.toBeCloseTo(20, 3);
		} else if (name.includes('uncontrolled')) {
			await page.locator('#move').click();
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__reactMapGLProof.map.getCenter().lng))
				.toBeCloseTo(8, 3);
		}
		if (name === 'Map#invalid token')
			expect(
				await page.evaluate(
					() => (globalThis as any).__reactMapGLProof.map._requestManager._customAccessToken,
				),
			).toBe('invalid');
		expect(errors).toEqual([]);
	} finally {
		page.off('pageerror', listener);
		page.off('console', consoleListener);
		await page.close();
	}
}

const libre = [
	'Map',
	'Map#uncontrolled',
	'Map#controlled#no-update',
	'Map#controlled#mirror-back',
	'Map#controlled#delayed-update',
	'useMap',
	'Controls',
	'Marker',
	'Popup',
	'Source/Layer',
	'Source/Layer',
] as const;
describe('maplibre', () => {
	for (const name of libre) it(name, () => run('maplibre', name), 12_000);
});
const box = [
	'Popup',
	'useMap',
	'Controls',
	'Map',
	'Map#invalid token',
	'Map#uncontrolled',
	'Map#controlled#no-update',
	'Map#uncontrolled#delayedSettingsUpdate',
	'Map#controlled#mirror-back',
	'Map#controlled#delayed-update',
	'Source/Layer',
	'Marker',
	'Source/Layer',
] as const;
describe('mapbox', () => {
	for (const name of box) it(name, () => run('mapbox', name), 12_000);
});
