import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const ALLOWED_DISPOSITIONS = new Set([
	'ported',
	'run-unchanged',
	'not-applicable',
	'pending-neutral',
	'pending-adaptation',
	'pending-harness',
]);

function walk(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

function isTestArtifact(relativePath) {
	return (
		/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(relativePath) ||
		[
			'test/browser.js',
			'test/node.js',
			'test/render/index.jsx',
			'test/render/test-cases.jsx',
			'test/src/exports.ts',
		].includes(relativePath) ||
		/^test\/size\/.+\.js$/.test(relativePath)
	);
}

export function discoverTestArtifacts(upstreamRoot) {
	return walk(upstreamRoot)
		.map((path) => relative(upstreamRoot, path).replaceAll('\\', '/'))
		.filter(isTestArtifact)
		.sort();
}

export function validateTestDisposition(discovered, artifacts) {
	const recorded = artifacts.map((entry) => entry.path).sort();
	if (new Set(recorded).size !== recorded.length)
		throw new Error('Duplicate upstream test disposition path');
	if (JSON.stringify([...discovered].sort()) !== JSON.stringify(recorded)) {
		const missing = discovered.filter((path) => !recorded.includes(path));
		const stale = recorded.filter((path) => !discovered.includes(path));
		throw new Error(
			`Upstream test disposition drift. Missing: ${missing.join(', ') || 'none'}; stale: ${stale.join(', ') || 'none'}`,
		);
	}
	for (const entry of artifacts) {
		if (!ALLOWED_DISPOSITIONS.has(entry.disposition)) {
			throw new Error(`Invalid disposition for ${entry.path}: ${entry.disposition}`);
		}
		if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
			throw new Error(`Missing disposition reason for ${entry.path}`);
		}
	}
}
