import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = join(packageRoot, 'upstream');
const checksumFile = join(upstreamRoot, 'SHA256SUMS');

if (!existsSync(checksumFile)) {
	throw new Error('Missing upstream/SHA256SUMS. Run pnpm upstream:sync.');
}

const entries = readFileSync(checksumFile, 'utf8').trim().split('\n').filter(Boolean);
if (entries.length === 0) throw new Error('upstream/SHA256SUMS is empty');

for (const entry of entries) {
	const match = /^([a-f0-9]{64})  (.+)$/.exec(entry);
	if (!match) throw new Error(`Malformed checksum entry: ${entry}`);
	const [, expected, relativePath] = match;
	const path = join(upstreamRoot, relativePath);
	if (!existsSync(path)) throw new Error(`Missing vendored upstream file: ${relativePath}`);
	const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
	if (actual !== expected) throw new Error(`Checksum mismatch: ${relativePath}`);
}

console.log(`Verified ${entries.length} react-map-gl 8.1.1 upstream files.`);
