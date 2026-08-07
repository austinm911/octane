import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256, validateTypeParity } from './type-parity-lib.mjs';

const root = resolve(import.meta.dirname, '..');
const pristinePath = resolve(root, 'upstream-typetests/public-api.test.tsx');
const adaptedPath = resolve(root, 'typetests/public-api.test.tsx');
const pristine = readFileSync(pristinePath, 'utf8');
const adapted = readFileSync(adaptedPath, 'utf8');
const result = validateTypeParity(pristine, adapted);
const inventory = {
	schemaVersion: 1,
	permittedTransformations: [
		'react-map-gl/mapbox -> ../src/mapbox',
		'react-map-gl/maplibre -> ../src/maplibre',
	],
	pristine: {
		path: 'packages/react-map-gl/upstream-typetests/public-api.test.tsx',
		sha256: sha256(pristine),
	},
	adapted: { path: 'packages/react-map-gl/typetests/public-api.test.tsx', sha256: sha256(adapted) },
	assertionGroups: result.groups,
	rejectionAssertions: result.rejectionAssertions,
};
const output = resolve(root, 'audit/type-parity.json');
if (process.argv.includes('--write'))
	writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
else {
	const recorded = JSON.parse(readFileSync(output, 'utf8'));
	if (JSON.stringify(recorded) !== JSON.stringify(inventory))
		throw new Error('Type parity inventory is stale');
}
console.log(
	`Verified ${result.groups.length} type assertion groups and ${result.rejectionAssertions} rejection assertions.`,
);
