import type { OctaneNode } from 'octane';
import MapboxController, { type MapboxProps } from './engines/mapbox/mapbox/mapbox';
import createRef, { type MapRef } from './engines/mapbox/mapbox/create-ref';
import setGlobals, { type GlobalSettings } from './engines/mapbox/utils/set-globals';
import type {
	AttributionControlInstance,
	AttributionControlOptions,
	ControlPosition,
	CustomLayerInterface,
	FullscreenControlOptions,
	GeolocateControlInstance,
	GeolocateControlOptions,
	IControl,
	MapLib,
	MapOptions,
	MarkerInstance,
	MarkerOptions,
	NavigationControlOptions,
	PopupInstance,
	PopupOptions,
	ScaleControlOptions,
} from './engines/mapbox/types/lib';
import type {
	GeolocateErrorEvent,
	GeolocateEvent,
	GeolocateResultEvent,
	MarkerDragEvent,
	MarkerEvent,
	PopupEvent,
} from './engines/mapbox/types/events';
import type {
	CanvasSourceSpecification,
	ImageSourceSpecification,
	LayerSpecification,
	SourceSpecification,
} from './engines/mapbox/types/style-spec';
import { MapProvider, useMap as useSharedMap, type MapCollection } from './internal/context';
import { MapRoot } from './internal/map-root';
import {
	AttributionControl as InternalAttributionControl,
	FullscreenControl as InternalFullscreenControl,
	GeolocateControl as InternalGeolocateControl,
	Layer as InternalLayer,
	Marker as InternalMarker,
	NavigationControl as InternalNavigationControl,
	Popup as InternalPopup,
	ScaleControl as InternalScaleControl,
	Source as InternalSource,
	useControl as useInternalControl,
} from './internal/components';
import type { CSSProperties, EngineConfig, MapContextValue, RefLike } from './internal/types';

const engine: EngineConfig = {
	name: 'mapbox',
	load: () => import('mapbox-gl'),
	Controller: MapboxController,
	createRef,
	setGlobals,
	childAttributes: { 'mapboxgl-children': '' },
};

type MapInitOptions = Omit<
	MapOptions,
	'style' | 'container' | 'bounds' | 'fitBoundsOptions' | 'center'
>;

export type MapProps = MapInitOptions &
	MapboxProps &
	GlobalSettings & {
		mapLib?: MapLib | Promise<MapLib>;
		reuseMaps?: boolean;
		id?: string;
		style?: CSSProperties;
		children?: OctaneNode;
		ref?: RefLike<MapRef>;
	};

export function Map(props: MapProps) {
	return <MapRoot {...(props as any)} engine={engine} />;
}

export default Map;

export type MarkerProps = MarkerOptions & {
	longitude: number;
	latitude: number;
	popup?: PopupInstance;
	style?: CSSProperties;
	onClick?: (event: MarkerEvent<MouseEvent>) => void;
	onDragStart?: (event: MarkerDragEvent) => void;
	onDrag?: (event: MarkerDragEvent) => void;
	onDragEnd?: (event: MarkerDragEvent) => void;
	children?: OctaneNode;
	ref?: RefLike<MarkerInstance>;
};

export const Marker = InternalMarker as unknown as (props: MarkerProps) => OctaneNode;

export type PopupProps = PopupOptions & {
	longitude: number;
	latitude: number;
	style?: CSSProperties;
	onOpen?: (event: PopupEvent) => void;
	onClose?: (event: PopupEvent) => void;
	children?: OctaneNode;
	ref?: RefLike<PopupInstance>;
};

export const Popup = InternalPopup as unknown as (props: PopupProps) => OctaneNode;

type StyledControlProps = { position?: ControlPosition; style?: CSSProperties };

export type AttributionControlProps = AttributionControlOptions & StyledControlProps;
export const AttributionControl = InternalAttributionControl as unknown as (
	props: AttributionControlProps,
) => OctaneNode;

export type FullscreenControlProps = Omit<FullscreenControlOptions, 'container'> &
	StyledControlProps & { containerId?: string };
export const FullscreenControl = InternalFullscreenControl as unknown as (
	props: FullscreenControlProps,
) => OctaneNode;

export type GeolocateControlProps = GeolocateControlOptions &
	StyledControlProps & {
		onGeolocate?: (event: GeolocateResultEvent) => void;
		onError?: (event: GeolocateErrorEvent) => void;
		onOutOfMaxBounds?: (event: GeolocateResultEvent) => void;
		onTrackUserLocationStart?: (event: GeolocateEvent) => void;
		onTrackUserLocationEnd?: (event: GeolocateEvent) => void;
		ref?: RefLike<GeolocateControlInstance>;
	};
export const GeolocateControl = InternalGeolocateControl as unknown as (
	props: GeolocateControlProps,
) => OctaneNode;

export type NavigationControlProps = NavigationControlOptions & StyledControlProps;
export const NavigationControl = InternalNavigationControl as unknown as (
	props: NavigationControlProps,
) => OctaneNode;

export type ScaleControlProps = ScaleControlOptions & StyledControlProps;
export const ScaleControl = InternalScaleControl as unknown as (
	props: ScaleControlProps,
) => OctaneNode;

type OptionalId<T> = T extends { id: string } ? Omit<T, 'id'> & { id?: string } : T;
type OptionalSource<T> = T extends { source: string } ? Omit<T, 'source'> & { source?: string } : T;

export type SourceProps = (SourceSpecification | CanvasSourceSpecification) & {
	id?: string;
	children?: OctaneNode;
};
export const Source = InternalSource as unknown as (props: SourceProps) => OctaneNode;

export type LayerProps = (OptionalSource<OptionalId<LayerSpecification>> | CustomLayerInterface) & {
	beforeId?: string;
};
export const Layer = InternalLayer as unknown as (props: LayerProps) => OctaneNode;

export { MapProvider };
export function useMap(): MapCollection<MapRef> {
	return useSharedMap<MapRef>();
}

export const useControl = useInternalControl as <T extends IControl>(
	onCreate: (context: MapContextValue) => T,
	onAddOrRemoveOrOptions?: ((context: MapContextValue) => void) | { position?: ControlPosition },
	onRemoveOrOptions?: ((context: MapContextValue) => void) | { position?: ControlPosition },
	options?: { position?: ControlPosition },
) => T;

export type { MapRef, CSSProperties, RefLike };
export * from './engines/mapbox/types/common';
export * from './engines/mapbox/types/events';
export * from './engines/mapbox/types/lib';
export * from './engines/mapbox/types/style-spec';
