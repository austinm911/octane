import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoverTestArtifacts, validateTestDisposition } from './test-disposition-lib.mjs';

const root = resolve(import.meta.dirname, '..');
const upstream = resolve(root, 'upstream');
const inventory = JSON.parse(readFileSync(resolve(root, 'audit/upstream-tests.json'), 'utf8'));
const discovered = discoverTestArtifacts(upstream);
validateTestDisposition(discovered, inventory.artifacts);
console.log(`Verified dispositions for ${discovered.length} upstream react-map-gl test artifacts.`);
