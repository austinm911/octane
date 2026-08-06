/* global document, setTimeout */
import {
	Children,
	cloneElement,
	createPortal,
	memo,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type OctaneNode,
} from 'octane';
import { useRequiredMapContext } from './context';
import type { CSSProperties, MapContextValue, RefLike } from './types';
import { applyReactStyle, arePointsEqual, deepEqual, compareClassNames } from './utils';
import assert from './utils';

export type InternalMarkerProps = {
	longitude: number;
	latitude: number;
	popup?: any;
	style?: CSSProperties;
	onClick?: (event: any) => void;
	onDragStart?: (event: any) => void;
	onDrag?: (event: any) => void;
	onDragEnd?: (event: any) => void;
	children?: OctaneNode;
	ref?: RefLike<any>;
	[key: string]: any;
};

export const Marker = memo(function Marker(props: InternalMarkerProps) {
	const { map, mapLib } = useRequiredMapContext();
	const thisRef = useRef({ props });

	const marker = useMemo(() => {
		let hasChildren = false;
		Children.forEach(props.children, (child) => {
			if (child) hasChildren = true;
		});

		const { ref: _ref, ...options } = props;
		const instance = new mapLib.Marker({
			...options,
			element: hasChildren ? document.createElement('div') : null,
		});
		instance.setLngLat([props.longitude, props.latitude]);

		instance.getElement().addEventListener('click', (originalEvent: MouseEvent) => {
			thisRef.current.props.onClick?.({ type: 'click', target: instance, originalEvent });
		});
		instance.on('dragstart', (event: any) => {
			event.lngLat = instance.getLngLat();
			thisRef.current.props.onDragStart?.(event);
		});
		instance.on('drag', (event: any) => {
			event.lngLat = instance.getLngLat();
			thisRef.current.props.onDrag?.(event);
		});
		instance.on('dragend', (event: any) => {
			event.lngLat = instance.getLngLat();
			thisRef.current.props.onDragEnd?.(event);
		});
		return instance;
	}, []);

	useEffect(() => {
		marker.addTo(map.getMap());
		return () => marker.remove();
	}, []);

	useEffect(() => {
		applyReactStyle(marker.getElement(), props.style);
	}, [props.style]);

	useImperativeHandle(props.ref, () => marker, []);

	const oldProps = thisRef.current.props;
	const current = marker.getLngLat();
	if (current.lng !== props.longitude || current.lat !== props.latitude) {
		marker.setLngLat([props.longitude, props.latitude]);
	}
	if (props.offset && !arePointsEqual(marker.getOffset(), props.offset)) {
		marker.setOffset(props.offset);
	}
	const draggable = props.draggable ?? false;
	if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);
	const rotation = props.rotation ?? 0;
	if (marker.getRotation() !== rotation) marker.setRotation(rotation);
	const rotationAlignment = props.rotationAlignment ?? 'auto';
	if (marker.getRotationAlignment() !== rotationAlignment) {
		marker.setRotationAlignment(rotationAlignment);
	}
	const pitchAlignment = props.pitchAlignment ?? 'auto';
	if (marker.getPitchAlignment() !== pitchAlignment) marker.setPitchAlignment(pitchAlignment);
	const popup = props.popup ?? null;
	if (marker.getPopup() !== popup) marker.setPopup(popup);

	const classNameDiff = compareClassNames(oldProps.className, props.className);
	if (classNameDiff) {
		for (const className of classNameDiff) marker.toggleClassName(className);
	}

	thisRef.current.props = props;
	return createPortal(props.children, marker.getElement());
});

export type InternalPopupProps = {
	longitude: number;
	latitude: number;
	style?: CSSProperties;
	onOpen?: (event: any) => void;
	onClose?: (event: any) => void;
	children?: OctaneNode;
	ref?: RefLike<any>;
	[key: string]: any;
};

export const Popup = memo(function Popup(props: InternalPopupProps) {
	const { map, mapLib } = useRequiredMapContext();
	const container = useMemo(() => document.createElement('div'), []);
	const thisRef = useRef({ props });

	const popup = useMemo(() => {
		const { ref: _ref, ...options } = props;
		const instance = new mapLib.Popup(options);
		instance.setLngLat([props.longitude, props.latitude]);
		instance.once('open', (event: any) => thisRef.current.props.onOpen?.(event));
		return instance;
	}, []);

	useEffect(() => {
		const onClose = (event: any) => thisRef.current.props.onClose?.(event);
		popup.on('close', onClose);
		popup.setDOMContent(container).addTo(map.getMap());
		return () => {
			popup.off('close', onClose);
			if (popup.isOpen()) popup.remove();
		};
	}, []);

	useEffect(() => {
		applyReactStyle(popup.getElement(), props.style);
	}, [props.style]);

	useImperativeHandle(props.ref, () => popup, []);

	if (popup.isOpen()) {
		const oldProps = thisRef.current.props;
		const current = popup.getLngLat();
		if (current.lng !== props.longitude || current.lat !== props.latitude) {
			popup.setLngLat([props.longitude, props.latitude]);
		}
		if (props.offset && !deepEqual(oldProps.offset, props.offset)) {
			popup.options.anchor = props.anchor;
			popup.setOffset(props.offset);
		}
		if (oldProps.anchor !== props.anchor || oldProps.maxWidth !== props.maxWidth) {
			popup.setMaxWidth(props.maxWidth);
		}
		const classNameDiff = compareClassNames(oldProps.className, props.className);
		if (classNameDiff) {
			for (const className of classNameDiff) popup.toggleClassName(className);
		}
		thisRef.current.props = props;
	}

	return createPortal(props.children, container);
});

export type ControlOptions = { position?: any };

export function useControl<T>(
	onCreate: (context: MapContextValue) => T,
	arg1?: ((context: MapContextValue) => void) | ControlOptions,
	arg2?: ((context: MapContextValue) => void) | ControlOptions,
	arg3?: ControlOptions,
): T {
	const context = useRequiredMapContext();
	const control = useMemo(() => onCreate(context), []);

	useEffect(() => {
		const options = (arg3 || arg2 || arg1) as ControlOptions | undefined;
		const onAdd = typeof arg1 === 'function' && typeof arg2 === 'function' ? arg1 : null;
		const onRemove = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : null;
		const { map } = context;

		if (!map.hasControl(control)) {
			map.addControl(control, options?.position);
			onAdd?.(context);
		}
		return () => {
			onRemove?.(context);
			if (map.hasControl(control)) map.removeControl(control);
		};
	}, []);

	return control;
}

function useStyledControl(props: Record<string, any>, type: string, containerKey = '_container') {
	const control = useControl(
		({ mapLib }) => {
			const Control = mapLib[type];
			if (!Control) throw new Error(`${type} is not available in the selected map library`);
			return new Control(props);
		},
		{ position: props.position },
	) as any;

	useEffect(() => {
		applyReactStyle(control[containerKey], props.style);
	}, [props.style]);
	return control;
}

export const AttributionControl = memo(function AttributionControl(props: Record<string, any>) {
	useStyledControl(props, 'AttributionControl');
	return null;
});

export const NavigationControl = memo(function NavigationControl(props: Record<string, any>) {
	useStyledControl(props, 'NavigationControl');
	return null;
});

export const LogoControl = memo(function LogoControl(props: Record<string, any>) {
	useStyledControl(props, 'LogoControl');
	return null;
});

export const TerrainControl = memo(function TerrainControl(props: Record<string, any>) {
	useStyledControl(props, 'TerrainControl');
	return null;
});

export const GlobeControl = memo(function GlobeControl(props: Record<string, any>) {
	useStyledControl(props, 'GlobeControl');
	return null;
});

export const FullscreenControl = memo(function FullscreenControl(props: Record<string, any>) {
	const { mapLib } = useRequiredMapContext();
	const control = useControl(
		() =>
			new mapLib.FullscreenControl({
				container: props.containerId ? document.getElementById(props.containerId) : undefined,
			}),
		{ position: props.position },
	) as any;
	useEffect(() => {
		applyReactStyle(control._controlContainer ?? control._container, props.style);
	}, [props.style]);
	return null;
});

export const ScaleControl = memo(function ScaleControl(props: Record<string, any>) {
	const control = useStyledControl(props, 'ScaleControl') as any;
	const previous = useRef(props);
	if (props.maxWidth !== undefined && props.maxWidth !== previous.current.maxWidth) {
		control.options.maxWidth = props.maxWidth;
	}
	if (props.unit !== undefined && props.unit !== previous.current.unit) {
		control.setUnit(props.unit);
	}
	previous.current = props;
	return null;
});

export const GeolocateControl = memo(function GeolocateControl(props: Record<string, any>) {
	const latest = useRef({ props });
	const control = useControl(
		({ mapLib }) => {
			const instance = new mapLib.GeolocateControl(props);
			if (typeof instance._setupUI === 'function') {
				const setupUI = instance._setupUI.bind(instance);
				instance._setupUI = (args: any) => {
					if (!instance._container?.hasChildNodes?.()) setupUI(args);
				};
			}
			instance.on('geolocate', (event: any) => latest.current.props.onGeolocate?.(event));
			instance.on('error', (event: any) => latest.current.props.onError?.(event));
			instance.on('outofmaxbounds', (event: any) => latest.current.props.onOutOfMaxBounds?.(event));
			instance.on('trackuserlocationstart', (event: any) =>
				latest.current.props.onTrackUserLocationStart?.(event),
			);
			instance.on('trackuserlocationend', (event: any) =>
				latest.current.props.onTrackUserLocationEnd?.(event),
			);
			return instance;
		},
		{ position: props.position },
	) as any;
	latest.current.props = props;
	useImperativeHandle(props.ref, () => control, []);
	useEffect(() => {
		applyReactStyle(control._container, props.style);
	}, [props.style]);
	return null;
});

export type InternalSourceProps = { id?: string; children?: OctaneNode; [key: string]: any };
let sourceCounter = 0;

function createSource(map: any, id: string, props: InternalSourceProps): any {
	if (!map?.style?._loaded) return null;
	const options = { ...props };
	delete options.id;
	delete options.children;
	map.addSource(id, options);
	return map.getSource(id);
}

function updateSource(source: any, props: InternalSourceProps, previous: InternalSourceProps) {
	assert(props.id === previous.id, 'source id changed');
	assert(props.type === previous.type, 'source type changed');

	let changedKey = '';
	let changedKeyCount = 0;
	for (const key in props) {
		if (key !== 'children' && key !== 'id' && !deepEqual(previous[key], props[key])) {
			changedKey = key;
			changedKeyCount++;
		}
	}
	if (!changedKeyCount) return;

	if (props.type === 'geojson') source.setData(props.data);
	else if (props.type === 'image') {
		source.updateImage({ url: props.url, coordinates: props.coordinates });
	} else if ('setCoordinates' in source && changedKeyCount === 1 && changedKey === 'coordinates') {
		source.setCoordinates(props.coordinates);
	} else if ('setUrl' in source && changedKey === 'url') source.setUrl(props.url);
	else if ('setTiles' in source && changedKey === 'tiles') source.setTiles(props.tiles);
	else console.warn(`Unable to update <Source> prop: ${changedKey}`);
}

export function Source(props: InternalSourceProps) {
	const map = useRequiredMapContext().map.getMap();
	const previous = useRef(props);
	const [, setStyleLoaded] = useState(0);
	const id = useMemo(() => props.id || `jsx-source-${sourceCounter++}`, []);

	useEffect(() => {
		if (!map) return undefined;
		const forceUpdate = () => setTimeout(() => setStyleLoaded((version) => version + 1), 0);
		map.on('styledata', forceUpdate);
		forceUpdate();
		return () => {
			map.off('styledata', forceUpdate);
			if (map.style?._loaded && map.getSource(id)) {
				const layers = map.getStyle()?.layers;
				if (layers) {
					for (const layer of layers) {
						if (layer.source === id) map.removeLayer(layer.id);
					}
				}
				map.removeSource(id);
			}
		};
	}, [map]);

	let source = map?.style && map.getSource(id);
	if (source) updateSource(source, props, previous.current);
	else source = createSource(map, id, props);
	previous.current = props;

	return source
		? Children.map(props.children, (child) =>
				child ? cloneElement(child as any, { source: id }) : child,
			)
		: null;
}

export type InternalLayerProps = { id?: string; beforeId?: string; [key: string]: any };
let layerCounter = 0;

function updateLayer(
	map: any,
	id: string,
	props: InternalLayerProps,
	previous: InternalLayerProps,
) {
	assert(props.id === previous.id, 'layer id changed');
	assert(props.type === previous.type, 'layer type changed');
	if (props.type === 'custom' || previous.type === 'custom') return;

	const { layout = {}, paint = {}, filter, minzoom, maxzoom, beforeId } = props;
	if (beforeId !== previous.beforeId) map.moveLayer(id, beforeId);

	if (layout !== previous.layout) {
		const oldLayout = previous.layout || {};
		for (const key in layout) {
			if (!deepEqual(layout[key], oldLayout[key])) map.setLayoutProperty(id, key, layout[key]);
		}
		for (const key in oldLayout) {
			if (!Object.prototype.hasOwnProperty.call(layout, key))
				map.setLayoutProperty(id, key, undefined);
		}
	}

	if (paint !== previous.paint) {
		const oldPaint = previous.paint || {};
		for (const key in paint) {
			if (!deepEqual(paint[key], oldPaint[key])) map.setPaintProperty(id, key, paint[key]);
		}
		for (const key in oldPaint) {
			if (!Object.prototype.hasOwnProperty.call(paint, key))
				map.setPaintProperty(id, key, undefined);
		}
	}

	if (!deepEqual(filter, previous.filter)) map.setFilter(id, filter);
	if (minzoom !== previous.minzoom || maxzoom !== previous.maxzoom) {
		map.setLayerZoomRange(id, minzoom, maxzoom);
	}
}

function createLayer(map: any, id: string, props: InternalLayerProps) {
	if (!map?.style?._loaded || ('source' in props && !map.getSource(props.source))) return;
	const options = { ...props, id };
	delete options.beforeId;
	map.addLayer(options, props.beforeId);
}

export function Layer(props: InternalLayerProps) {
	const map = useRequiredMapContext().map.getMap();
	const previous = useRef(props);
	const [, setStyleLoaded] = useState(0);
	const id = useMemo(() => props.id || `jsx-layer-${layerCounter++}`, []);

	useEffect(() => {
		if (!map) return undefined;
		const forceUpdate = () => setStyleLoaded((version) => version + 1);
		map.on('styledata', forceUpdate);
		forceUpdate();
		return () => {
			map.off('styledata', forceUpdate);
			if (map.style?._loaded && map.getLayer(id)) map.removeLayer(id);
		};
	}, [map]);

	const layer = map?.style && map.getLayer(id);
	if (layer) {
		try {
			updateLayer(map, id, props, previous.current);
		} catch (error) {
			console.warn(error);
		}
	} else {
		createLayer(map, id, props);
	}
	previous.current = props;
	return null;
}
