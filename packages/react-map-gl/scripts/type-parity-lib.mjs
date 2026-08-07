import { createHash } from 'node:crypto';

export function sha256(text) {
	return createHash('sha256').update(text).digest('hex');
}

export function normalizeTypeParitySource(text) {
	return text
		.replaceAll("from 'react-map-gl/mapbox'", "from '../src/mapbox'")
		.replaceAll("from 'react-map-gl/maplibre'", "from '../src/maplibre'");
}

export function assertionGroups(text) {
	return [...text.matchAll(/^\/\/ TYPE-PARITY: (.+)$/gm)].map((match) => match[1]);
}

export function validateTypeParity(pristine, adapted) {
	const pristineGroups = assertionGroups(pristine);
	const adaptedGroups = assertionGroups(adapted);
	if (pristineGroups.length === 0) throw new Error('Type parity suite has no assertion groups');
	if (new Set(pristineGroups).size !== pristineGroups.length)
		throw new Error('Duplicate type assertion group');
	if (JSON.stringify(pristineGroups) !== JSON.stringify(adaptedGroups)) {
		throw new Error('Type assertion group drift');
	}
	const pristineErrors = (pristine.match(/@ts-expect-error/g) ?? []).length;
	const adaptedErrors = (adapted.match(/@ts-expect-error/g) ?? []).length;
	if (pristineErrors === 0 || pristineErrors !== adaptedErrors) {
		throw new Error('Type rejection assertion drift');
	}
	if (normalizeTypeParitySource(pristine) !== adapted) {
		throw new Error('Type parity source drift outside permitted import transformations');
	}
	return { groups: pristineGroups, rejectionAssertions: pristineErrors };
}
