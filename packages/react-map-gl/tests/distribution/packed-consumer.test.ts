import { execFileSync } from 'node:child_process';
import {
	cpSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../../../..');
const FIXTURE_ROOT = resolve(import.meta.dirname, '_fixtures/consumer');
const PACKAGES = {
	octane: resolve(WORKSPACE_ROOT, 'packages/octane'),
	'@octanejs/react-map-gl': resolve(WORKSPACE_ROOT, 'packages/react-map-gl'),
} as const;

function isWithin(directory: string, target: string): boolean {
	const path = relative(directory, target);
	return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function packPackages(archiveRoot: string): Record<keyof typeof PACKAGES, string> {
	return Object.fromEntries(
		Object.entries(PACKAGES).map(([name, directory]) => {
			const destination = join(archiveRoot, name.replaceAll('/', '-').replaceAll('@', ''));
			mkdirSync(destination, { recursive: true });
			execFileSync('pnpm', ['--dir', directory, 'pack', '--pack-destination', destination], {
				cwd: WORKSPACE_ROOT,
				stdio: ['ignore', 'pipe', 'pipe'],
				timeout: 120_000,
			});
			const archives = readdirSync(destination).filter((entry) => entry.endsWith('.tgz'));
			expect(archives, `${name} should produce one package archive`).toHaveLength(1);
			return [name, join(destination, archives[0])];
		}),
	) as Record<keyof typeof PACKAGES, string>;
}

describe('@octanejs/react-map-gl packed consumer', () => {
	it('publishes source that typechecks from an install outside the workspace', () => {
		const temporaryRoot = mkdtempSync(join(tmpdir(), 'octane-react-map-gl-packed-'));
		const consumerRoot = join(temporaryRoot, 'consumer');
		try {
			const archives = packPackages(join(temporaryRoot, 'archives'));
			mkdirSync(consumerRoot, { recursive: true });
			cpSync(FIXTURE_ROOT, consumerRoot, { recursive: true });
			writeFileSync(
				join(consumerRoot, 'package.json'),
				`${JSON.stringify(
					{
						name: 'react-map-gl-packed-consumer',
						private: true,
						type: 'module',
						dependencies: {
							'@octanejs/react-map-gl': `file:${archives['@octanejs/react-map-gl']}`,
							'mapbox-gl': '3.9.0',
							'maplibre-gl': '5.0.0',
							octane: `file:${archives.octane}`,
						},
						devDependencies: { typescript: '5.9.3', vite: '8.1.5' },
					},
					null,
					2,
				)}\n`,
				'utf8',
			);

			execFileSync(
				'pnpm',
				['install', '--prefer-offline', '--ignore-scripts', '--no-frozen-lockfile'],
				{
					cwd: consumerRoot,
					env: { ...process.env, CI: '1' },
					stdio: ['ignore', 'pipe', 'pipe'],
					timeout: 120_000,
				},
			);

			const consumerRequire = createRequire(join(consumerRoot, 'package.json'));
			for (const engine of ['mapbox', 'maplibre']) {
				const installedEntry = realpathSync(
					consumerRequire.resolve(`@octanejs/react-map-gl/${engine}`),
				);
				expect(isWithin(WORKSPACE_ROOT, installedEntry)).toBe(false);
				expect(installedEntry).toMatch(
					new RegExp(`node_modules.*@octanejs.*react-map-gl.*src.*${engine}\\.tsx$`),
				);
				expect(readFileSync(installedEntry, 'utf8')).toContain('export function Map');
			}

			const archiveEntries = execFileSync('tar', ['-tzf', archives['@octanejs/react-map-gl']], {
				encoding: 'utf8',
			});
			expect(archiveEntries).not.toMatch(/package\/(?:upstream|tests|audit)\//);

			execFileSync(
				join(consumerRoot, 'node_modules/.bin/tsc'),
				['--noEmit', '-p', 'tsconfig.json'],
				{
					cwd: consumerRoot,
					stdio: ['ignore', 'pipe', 'pipe'],
					timeout: 120_000,
				},
			);
			execFileSync(process.execPath, ['build.mjs'], {
				cwd: consumerRoot,
				stdio: ['ignore', 'pipe', 'pipe'],
				timeout: 120_000,
			});
			const serverBundle = readFileSync(join(consumerRoot, 'dist-ssr/ssr-entry.js'), 'utf8');
			expect(serverBundle).toContain('serverEntryProof');
		} finally {
			rmSync(temporaryRoot, { recursive: true, force: true });
		}
	}, 240_000);
});
