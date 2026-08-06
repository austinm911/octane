import type { OctaneNode } from 'octane';

export type CSSProperties = Record<string, string | number | null | undefined>;

export type RefLike<T> = ((value: T | null) => void) | { current: T | null } | null | undefined;

export interface MapRefLike {
	getMap(): any;
	[key: string]: any;
}

export interface MapContextValue {
	mapLib: any;
	map: MapRefLike;
}

export interface MountedMapsContextValue {
	maps: Record<string, MapRefLike>;
	onMapMount(map: MapRefLike, id?: string): void;
	onMapUnmount(id?: string): void;
}

export interface ControllerLike {
	map: any;
	setProps(props: Record<string, any>): void;
	recycle(): void;
	destroy(): void;
}

export interface ControllerConstructor {
	new (
		MapClass: new (options: any) => any,
		props: Record<string, any>,
		container: HTMLDivElement,
	): ControllerLike;
	reuse(props: Record<string, any>, container: HTMLDivElement): ControllerLike | null;
}

export interface EngineConfig {
	name: 'mapbox' | 'maplibre' | 'mapbox-legacy';
	load(): Promise<any>;
	Controller: ControllerConstructor;
	createRef(controller: ControllerLike): MapRefLike | null;
	setGlobals?: (mapLib: any, props: Record<string, any>) => void;
	childAttributes: Record<string, string>;
}

export interface InternalMapProps {
	engine: EngineConfig;
	mapLib?: any | Promise<any>;
	reuseMaps?: boolean;
	id?: string;
	style?: CSSProperties;
	children?: OctaneNode;
	ref?: RefLike<MapRefLike>;
	onError?: (event: any) => void;
	[key: string]: any;
}
