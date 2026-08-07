#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
	compareTestIdentities,
	toPortablePath,
} from '../../../scripts/react-parity/harness-lib.mjs';

const root = resolve(import.meta.dirname, '../../..');
const lanes = [
	{
		project: 'react-map-gl-pristine',
		testRoot: 'packages/react-map-gl/tests/pristine/',
		destination: 'packages/react-map-gl/audit/pristine-runtime.json',
	},
	{
		project: 'react-map-gl-upstream',
		testRoot: 'packages/react-map-gl/tests/upstream/',
		destination: 'packages/react-map-gl/audit/adapted-runtime.json',
	},
];
for (const lane of lanes) {
	const occurrences = new Map();
	const output = execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', lane.project, '--json'],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	);
	const tests = JSON.parse(output)
		.map((test) => ({ ...test, relativeFile: toPortablePath(relative(root, test.file)) }))
		.filter((test) => test.relativeFile.startsWith(lane.testRoot))
		.map((test) => {
			const fullName = test.name.replaceAll(' > ', ' ');
			const baseId = `runtime:${createHash('sha256').update(`${test.relativeFile}\0${fullName}`).digest('hex').slice(0, 16)}`;
			const occurrence = occurrences.get(baseId) ?? 0;
			occurrences.set(baseId, occurrence + 1);
			return {
				id: occurrence === 0 ? baseId : `${baseId}:${occurrence + 1}`,
				file: test.relativeFile,
				fullName,
			};
		})
		.sort(compareTestIdentities);
	const inventory = {
		schemaVersion: 1,
		project: lane.project,
		roots: [lane.testRoot.slice(0, -1)],
		files: [...new Set(tests.map((test) => test.file))],
		tests,
	};
	const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
	const destination = resolve(root, lane.destination);
	if (process.argv.includes('--check')) {
		if (readFileSync(destination, 'utf8') !== serialized)
			throw new Error(`${lane.destination} is stale`);
	} else writeFileSync(destination, serialized);
	console.log(`${lane.destination}: ${tests.length} tests`);
}
