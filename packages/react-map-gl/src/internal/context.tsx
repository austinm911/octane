import { createContext, useCallback, useContext, useMemo, useState, type OctaneNode } from 'octane';
import type { MapContextValue, MapRefLike, MountedMapsContextValue } from './types';

export const MapContext = createContext<MapContextValue | null>(null);
export const MountedMapsContext = createContext<MountedMapsContextValue | null>(null);

export function useRequiredMapContext(): MapContextValue {
	const context = useContext(MapContext);
	if (context === null) {
		throw new Error('Map components must be rendered as descendants of <Map>.');
	}
	return context;
}

export function MapProvider(props: { children?: OctaneNode }) {
	const [maps, setMaps] = useState<Record<string, MapRefLike>>({});

	const onMapMount = useCallback((map: MapRefLike, id = 'default') => {
		setMaps((current) => {
			if (id === 'current') {
				throw new Error("'current' cannot be used as map id");
			}
			if (current[id]) {
				throw new Error(`Multiple maps with the same id: ${id}`);
			}
			return { ...current, [id]: map };
		});
	}, []);

	const onMapUnmount = useCallback((id = 'default') => {
		setMaps((current) => {
			if (!current[id]) return current;
			const next = { ...current };
			delete next[id];
			return next;
		});
	}, []);

	const value = useMemo(
		() => ({ maps, onMapMount, onMapUnmount }),
		[maps, onMapMount, onMapUnmount],
	);

	return <MountedMapsContext.Provider value={value}>{props.children}</MountedMapsContext.Provider>;
}

export type MapCollection<TMapRef extends MapRefLike = MapRefLike> = Record<
	string,
	TMapRef | undefined
> & {
	current?: TMapRef;
};

export function useMap<TMapRef extends MapRefLike = MapRefLike>(): MapCollection<TMapRef> {
	const maps = useContext(MountedMapsContext)?.maps;
	const currentMap = useContext(MapContext);

	return useMemo(
		() => ({ ...maps, current: currentMap?.map }) as MapCollection<TMapRef>,
		[maps, currentMap],
	);
}
