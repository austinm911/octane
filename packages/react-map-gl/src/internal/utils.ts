import type { CSSProperties } from './types';

const unitlessNumber = /box|flex|grid|column|lineHeight|fontWeight|opacity|order|tabSize|zIndex/;

export function applyReactStyle(element?: HTMLElement | null, styles?: CSSProperties | null): void {
	if (!element || !styles) return;
	const style = element.style as any;
	for (const key in styles) {
		const value = styles[key];
		if (value === null || value === undefined) {
			style[key] = '';
		} else if (Number.isFinite(value) && !unitlessNumber.test(key)) {
			style[key] = `${value}px`;
		} else {
			style[key] = value;
		}
	}
}

export function arePointsEqual(a?: any, b?: any): boolean {
	const ax = Array.isArray(a) ? a[0] : a ? a.x : 0;
	const ay = Array.isArray(a) ? a[1] : a ? a.y : 0;
	const bx = Array.isArray(b) ? b[0] : b ? b.x : 0;
	const by = Array.isArray(b) ? b[1] : b ? b.y : 0;
	return ax === bx && ay === by;
}

export function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	if (Array.isArray(b)) return false;
	if (typeof a === 'object' && typeof b === 'object') {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		if (aKeys.length !== bKeys.length) return false;
		for (const key of aKeys) {
			if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false;
		}
		return true;
	}
	return false;
}

export function compareClassNames(oldClassName?: string, newClassName?: string): string[] | null {
	if (oldClassName === newClassName) return null;
	const oldClasses = new Set((oldClassName || '').split(/\s+/).filter(Boolean));
	const newClasses = new Set((newClassName || '').split(/\s+/).filter(Boolean));
	const changed: string[] = [];
	for (const name of oldClasses) if (!newClasses.has(name)) changed.push(name);
	for (const name of newClasses) if (!oldClasses.has(name)) changed.push(name);
	return changed;
}

export default function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}
