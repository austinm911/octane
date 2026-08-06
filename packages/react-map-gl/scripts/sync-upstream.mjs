import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = 'v8.1.1';
const COMMIT = 'f295bd524e01b7fc0fb9c9e9d1d5bd47b055b67d';
const REPOSITORY = 'https://github.com/visgl/react-map-gl.git';
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = mkdtempSync(join(tmpdir(), 'octane-react-map-gl-'));
const checkout = join(tempRoot, 'upstream');

function copy(source, destination) {
	if (!existsSync(source)) return;
	mkdirSync(dirname(destination), { recursive: true });
	cpSync(source, destination, { recursive: true, force: true, dereference: true });
}

function walk(root) {
	const result = [];
	if (!existsSync(root)) return result;
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) result.push(...walk(path));
		else result.push(path);
	}
	return result;
}

try {
	execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', TAG, REPOSITORY, checkout], {
		stdio: 'inherit',
	});
	const actualCommit = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], {
		encoding: 'utf8',
	}).trim();
	if (actualCommit !== COMMIT) {
		throw new Error(`Expected ${COMMIT}, received ${actualCommit}`);
	}

	const upstreamRoot = join(packageRoot, 'upstream');
	rmSync(upstreamRoot, { recursive: true, force: true });
	mkdirSync(upstreamRoot, { recursive: true });

	copy(join(checkout, 'LICENSE'), join(upstreamRoot, 'LICENSE'));
	for (const file of ['README.md', 'CHANGELOG.md', 'package.json', 'vitest.config.ts']) {
		copy(join(checkout, file), join(upstreamRoot, file));
	}
	for (const moduleName of ['main', 'react-mapbox', 'react-maplibre']) {
		const source = join(checkout, 'modules', moduleName);
		const destination = join(upstreamRoot, 'modules', moduleName);
		for (const entry of ['package.json', 'README.md', 'src', 'test']) {
			copy(join(source, entry), join(destination, entry));
		}
	}
	copy(join(checkout, 'test'), join(upstreamRoot, 'test'));

	const enginesRoot = join(packageRoot, 'src', 'engines');
	rmSync(enginesRoot, { recursive: true, force: true });
	for (const [moduleName, engineName, controllerDirectory] of [
		['react-mapbox', 'mapbox', 'mapbox'],
		['react-maplibre', 'maplibre', 'maplibre'],
	]) {
		const sourceRoot = join(checkout, 'modules', moduleName, 'src');
		const destinationRoot = join(enginesRoot, engineName);
		for (const entry of [controllerDirectory, 'types', 'utils']) {
			copy(join(sourceRoot, entry), join(destinationRoot, entry));
		}

		for (const file of walk(destinationRoot)) {
			if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
			const text = readFileSync(file, 'utf8');
			const name = relative(destinationRoot, file).replaceAll('\\', '/');
			if (
				/from ['"]react(?:-dom)?['"]/.test(text) ||
				/import \* as React from ['"]react['"]/.test(text)
			) {
				if (
					name === 'utils/apply-react-style.ts' ||
					name === 'utils/use-isomorphic-layout-effect.ts'
				) {
					rmSync(file);
					continue;
				}
				throw new Error(
					`Unexpected React dependency in reusable engine source: ${engineName}/${name}`,
				);
			}
			writeFileSync(
				file,
				`// @ts-nocheck -- pinned framework-neutral react-map-gl ${TAG} source; see UPSTREAM.md\n${text}`,
			);
		}
	}

	const checksums = walk(upstreamRoot)
		.filter((file) => !file.endsWith('SHA256SUMS'))
		.sort()
		.map((file) => {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  ${relative(upstreamRoot, file).replaceAll('\\', '/')}`;
		});
	writeFileSync(join(upstreamRoot, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
} finally {
	rmSync(tempRoot, { recursive: true, force: true });
}
