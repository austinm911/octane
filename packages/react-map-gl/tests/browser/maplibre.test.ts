// @vitest-environment node
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const stagedRoot = realpathSync(mkdtempSync(join(tmpdir(), 'octane-maplibre-browser-')));
const buildHelper = resolve(import.meta.dirname, '_build.mjs');
const execFileAsync = promisify(execFile);
let server: Server | undefined;
let origin = '';
let output = '';
let hasMapboxToken = false;

function startStaticServer(root: string): Promise<Server> {
	const instance = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://fixture.test');
		const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
		const file = resolve(root, `.${pathname}`);
		if (relative(root, file).startsWith('..') || !existsSync(file) || !statSync(file).isFile()) {
			response.writeHead(404).end('Not found');
			return;
		}
		const types: Record<string, string> = {
			'.css': 'text/css',
			'.html': 'text/html; charset=utf-8',
			'.js': 'text/javascript',
			'.map': 'application/json',
			'.woff2': 'font/woff2',
		};
		response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
		response.end(readFileSync(file));
	});
	return new Promise((resolveServer, reject) => {
		instance.once('error', reject);
		instance.listen(0, '127.0.0.1', () => resolveServer(instance));
	});
}

beforeAll(async () => {
	const { stdout } = await execFileAsync(process.execPath, [buildHelper, stagedRoot], {
		cwd: stagedRoot,
		maxBuffer: 20 * 1024 * 1024,
	});
	const line = stdout
		.split('\n')
		.findLast((entry) => entry.startsWith('__OCTANE_MAPLIBRE_BUILD__'));
	if (line === undefined)
		throw new Error(`MapLibre build helper returned no evidence:
${stdout}`);
	const buildEvidence = JSON.parse(line.slice('__OCTANE_MAPLIBRE_BUILD__'.length));
	output = buildEvidence.outDir;
	hasMapboxToken = buildEvidence.hasMapboxToken;
	server = await startStaticServer(output);
	const address = server.address();
	if (address === null || typeof address === 'string')
		throw new Error('No browser fixture address');
	origin = `http://127.0.0.1:${address.port}`;
}, 180_000);

afterAll(async () => {
	await new Promise<void>((resolveClose, reject) => {
		if (server === undefined) return resolveClose();
		server.close((error) => (error === undefined ? resolveClose() : reject(error)));
	});
	rmSync(stagedRoot, { recursive: true, force: true });
});

describe('real WebGL browser integration', () => {
	it('keeps MapLibre sources, layers, events, resizing, and a reused map live', async () => {
		expect(existsSync(resolve(output, 'index.html'))).toBe(true);
		const { chromium } = await import('playwright');
		const browser = await chromium.launch({
			headless: true,
			args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
		});
		const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
		try {
			await page.goto(origin, { waitUntil: 'load' });
			await page.locator('[data-map-app][data-loaded="true"]').waitFor({ timeout: 30_000 });
			const canvas = page.locator('.maplibregl-canvas');
			await canvas.waitFor();
			await page.locator('.maplibregl-popup').waitFor();
			await expect
				.poll(() =>
					page.evaluate(() => ({
						loads: (globalThis as any).__octaneMapProof.loads,
						longitude: (globalThis as any).__octaneMap.getSource('proof-source').serialize().data
							.features[0].geometry.coordinates[0],
						radius: (globalThis as any).__octaneMap.getPaintProperty(
							'proof-layer',
							'circle-radius',
						),
					})),
				)
				.toEqual({ loads: 1, longitude: 0, radius: 6 });

			await page.locator('#update-style').click();
			await expect
				.poll(() =>
					page.evaluate(() => ({
						longitude: (globalThis as any).__octaneMap.getSource('proof-source').serialize().data
							.features[0].geometry.coordinates[0],
						radius: (globalThis as any).__octaneMap.getPaintProperty(
							'proof-layer',
							'circle-radius',
						),
					})),
				)
				.toEqual({ longitude: 10, radius: 9 });
			await page.locator('#resize-map').click();
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__octaneMapProof.resizes))
				.toBeGreaterThan(0);
			await canvas.click({ position: { x: 100, y: 100 } });
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__octaneMapProof.clicks))
				.toBe(1);

			await page.locator('#toggle-map').click();
			await expect.poll(() => canvas.count()).toBe(0);
			await page.locator('#toggle-map').click();
			await expect.poll(() => canvas.count()).toBe(1);
			await expect
				.poll(() =>
					page.evaluate(() => ({
						reusedMap: (globalThis as any).__octaneMapProof.reusedMap,
						reusedCanvas: (globalThis as any).__octaneMapProof.reusedCanvas,
					})),
				)
				.toEqual({ reusedMap: true, reusedCanvas: true });
			expect(errors).toEqual([]);
		} finally {
			await page.close();
			await browser.close();
		}
	}, 60_000);

	it('loads the modern Mapbox entry with real WebGL, Source, and Layer', async () => {
		const { chromium } = await import('playwright');
		const browser = await chromium.launch({
			headless: true,
			args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
		});
		const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
		const errors: string[] = [];
		const responses: string[] = [];
		page.on('pageerror', (error) => errors.push(String(error)));
		page.on('response', (response) => responses.push(response.url()));
		try {
			await page.goto(`${origin}/?engine=mapbox`, { waitUntil: 'load' });
			await page.locator('[data-engine="mapbox"][data-loaded="true"]').waitFor({ timeout: 45_000 });
			await page.locator('.mapboxgl-canvas').waitFor();
			await page.locator('.mapboxgl-marker').waitFor();
			await page.locator('.mapboxgl-popup').waitFor();
			await page.locator('.mapboxgl-ctrl-zoom-in').waitFor();
			await expect
				.poll(() =>
					page.evaluate(() => ({
						loads: (globalThis as any).__octaneMapProof.loads,
						radius: (globalThis as any).__octaneMap.getPaintProperty(
							'proof-layer',
							'circle-radius',
						),
					})),
				)
				.toEqual({ loads: 1, radius: 6 });
			expect(errors).toEqual([]);
			const hostedRequests = responses.filter((url) => url.includes('api.mapbox.com'));
			if (hasMapboxToken) expect(hostedRequests.length).toBeGreaterThan(0);
			else expect(hostedRequests).toEqual([]);
		} finally {
			await page.close();
			await browser.close();
		}
	}, 60_000);
});
