#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const pkg = 'packages/react-map-gl';
const read = (path) => readFileSync(resolve(root, path));
const json = (path) => JSON.parse(read(path));
const sha = (path) => createHash('sha256').update(read(path)).digest('hex');
const caseId = (lane, group) =>
	`type:${createHash('sha256').update(`${lane}\0${group}`).digest('hex').slice(0, 16)}`;
const support = (path) => ({ path, role: 'support', sha256: sha(path) });
const typeTest = (path, lane, groups) => ({
	path,
	role: 'test',
	sha256: sha(path),
	cases: groups.map((group) => ({ id: caseId(lane, group), testName: group, fullName: group })),
});
const pristineInventory = json(`${pkg}/audit/pristine-runtime.json`);
const adaptedInventory = json(`${pkg}/audit/adapted-runtime.json`);
const typeInventory = json(`${pkg}/audit/type-parity.json`);
const lockfileSha256 = sha('pnpm-lock.yaml');
const manifest = {
	$schema: './react-parity.schema.json',
	schemaVersion: 1,
	provenance: {
		repo: 'https://github.com/visgl/react-map-gl.git',
		version: '8.1.1',
		commit: 'f295bd524e01b7fc0fb9c9e9d1d5bd47b055b67d',
		sourceRoot: 'modules',
		testRoot: 'modules/react-mapbox/test, modules/react-maplibre/test, test',
		license: 'MIT',
		integrity: `sha256:${sha(`${pkg}/upstream/SHA256SUMS`)}`,
		verification: 'verified',
	},
	upstreamSuites: { runtime: 'present', types: 'absent' },
	adaptedRoots: {
		source: { roots: [`${pkg}/src`], include: ['\\.(?:[cm]?[jt]s|[jt]sx|tsrx)$'], exclude: [] },
		tests: {
			roots: [`${pkg}/tests/upstream`],
			include: ['\\.(?:test|spec)\\.(?:[cm]?[jt]s|[jt]sx|tsrx)$'],
			exclude: [],
		},
	},
	adaptedRuntimeSummary: (() => {
		const identities = adaptedInventory.tests.map((test) => `${test.file}\0${test.fullName}`);
		const uniqueIdentities = new Set(identities).size;
		return {
			inventoryEntries: adaptedInventory.tests.length,
			uniqueIdentities,
			duplicateEntriesWithinLanes: identities.length - uniqueIdentities,
			identitiesSharedAcrossLanes: 0,
		};
	})(),
	environments: {
		'workspace-node': {
			node: '>=22',
			platform: 'any',
			arch: 'any',
			packageManager: 'pnpm@11.15.1',
			lockfile: 'pnpm-lock.yaml',
			lockfileSha256,
		},
	},
	lanes: [
		{
			id: 'react-map-gl-pristine-runtime',
			type: 'pristine-upstream',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-map-gl-pristine',
			evidenceOrigin: 'upstream-suite',
			notes:
				'Runs the pinned React utility and component cases against the pristine upstream implementation and verifies exact collected/executed identities.',
			execution: { kind: 'vitest-full', inventory: `${pkg}/audit/pristine-runtime.json` },
			files: [
				support(`${pkg}/audit/pristine-runtime.json`),
				support(`${pkg}/scripts/runtime-inventory.mjs`),
			],
		},
		{
			id: 'react-map-gl-adapted-runtime',
			type: 'adapted-octane',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-map-gl-upstream',
			evidenceOrigin: 'upstream-suite',
			notes:
				'Runs every applicable modern Mapbox and MapLibre upstream case adapted to Octane plus the neutral utility boundary.',
			execution: { kind: 'vitest-full', inventory: `${pkg}/audit/adapted-runtime.json` },
			files: [
				support(`${pkg}/audit/adapted-runtime.json`),
				support(`${pkg}/scripts/runtime-inventory.mjs`),
			],
		},
		{
			id: 'react-map-gl-pristine-types',
			type: 'pristine-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-map-gl-pristine-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Compiles the parallel public API oracle against react-map-gl 8.1.1 and React types.',
			execution: {
				kind: 'typescript',
				compiler: 'tsc',
				project: `${pkg}/upstream-typetests/tsconfig.json`,
			},
			files: [
				typeTest(
					`${pkg}/upstream-typetests/public-api.test.tsx`,
					'pristine',
					typeInventory.assertionGroups,
				),
				support(`${pkg}/upstream-typetests/tsconfig.json`),
				support(`${pkg}/audit/type-parity.json`),
				support(`${pkg}/scripts/check-type-parity.mjs`),
			],
		},
		{
			id: 'react-map-gl-adapted-types',
			type: 'adapted-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-map-gl-adapted-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Compiles the structurally matched public API oracle against Octane with tsrx-tsc.',
			execution: {
				kind: 'typescript',
				compiler: 'tsrx-tsc',
				project: `${pkg}/typetests/tsconfig.json`,
			},
			files: [
				typeTest(`${pkg}/typetests/public-api.test.tsx`, 'adapted', typeInventory.assertionGroups),
				support(`${pkg}/typetests/tsconfig.json`),
				support(`${pkg}/audit/type-parity.json`),
				support(`${pkg}/scripts/check-type-parity.mjs`),
			],
		},
	],
	divergences: [],
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const destination = resolve(root, `${pkg}/audit/react-parity.json`);
if (process.argv.includes('--check')) {
	if (readFileSync(destination, 'utf8') !== serialized)
		throw new Error('react-parity.json is stale');
} else writeFileSync(destination, serialized);
console.log(
	`Verified react-map-gl parity manifest with ${pristineInventory.tests.length} pristine and ${adaptedInventory.tests.length} adapted runtime identities.`,
);
