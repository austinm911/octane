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
	output = JSON.parse(line.slice('__OCTANE_MAPLIBRE_BUILD__'.length)).outDir;
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

describe('MapLibre production browser integration', () => {
	it('builds authored source and loads one real WebGL map with controls, overlays, and style data', async () => {
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
			await page.locator('[data-maplibre-app][data-loaded="true"]').waitFor({ timeout: 30_000 });
			await page.locator('.maplibregl-canvas').waitFor({ timeout: 30_000 });
			await page.locator('.maplibregl-marker').waitFor({ timeout: 30_000 });
			await page.locator('.maplibregl-ctrl').first().waitFor({ timeout: 30_000 });
			const proof = await page.evaluate(() => ({
				global: (globalThis as any).__octaneMapLibreProof,
				canvases: document.querySelectorAll('.maplibregl-canvas').length,
				markers: document.querySelectorAll('.maplibregl-marker').length,
				controls: document.querySelectorAll('.maplibregl-ctrl').length,
			}));
			expect(proof).toEqual({
				global: { loads: 1, canvases: 1 },
				canvases: 1,
				markers: 1,
				controls: expect.any(Number),
			});
			expect(proof.controls).toBeGreaterThan(0);

			await page.locator('#toggle-map').click();
			await expect.poll(() => page.locator('.maplibregl-canvas').count()).toBe(0);
			await page.locator('#toggle-map').click();
			await expect.poll(() => page.locator('.maplibregl-canvas').count()).toBe(1);
			await expect
				.poll(() => page.evaluate(() => (globalThis as any).__octaneMapLibreProof?.loads))
				.toBe(2);
			expect(errors).toEqual([]);
		} finally {
			await page.close();
			await browser.close();
		}
	}, 60_000);
});
