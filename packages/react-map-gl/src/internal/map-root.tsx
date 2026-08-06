import {
	useContext,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'octane';
import { MapContext, MountedMapsContext } from './context';
import type { ControllerLike, InternalMapProps, MapContextValue, MapRefLike } from './types';

const CHILD_CONTAINER_STYLE = { height: '100%' } as const;

function normalizeMapLibrary(module: any): any {
	if (!module) throw new Error('Invalid mapLib');
	const mapLib = 'Map' in module ? module : module.default;
	if (!mapLib?.Map) throw new Error('Invalid mapLib');
	return mapLib;
}

function withoutInternalProps(props: InternalMapProps): Record<string, any> {
	const { engine: _engine, ref: _ref, ...mapProps } = props;
	return mapProps;
}

export function MapRoot(props: InternalMapProps) {
	const mountedMapsContext = useContext(MountedMapsContext);
	const [controller, setController] = useState<ControllerLike | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contextValueRef = useRef<MapContextValue>({ mapLib: null, map: null as any });
	const mapProps = withoutInternalProps(props);

	useEffect(() => {
		let mounted = true;
		let instance: ControllerLike | null = null;

		Promise.resolve(props.mapLib ?? props.engine.load())
			.then((module) => {
				if (!mounted) return;
				const container = containerRef.current;
				if (!container) return;

				const mapLib = normalizeMapLibrary(module);
				props.engine.setGlobals?.(mapLib, mapProps);

				if (props.reuseMaps) {
					instance = props.engine.Controller.reuse(mapProps, container);
				}
				instance ??= new props.engine.Controller(mapLib.Map, mapProps, container);

				const map = props.engine.createRef(instance);
				if (!map) throw new Error(`Unable to create ${props.engine.name} map ref`);

				contextValueRef.current.map = map;
				contextValueRef.current.mapLib = mapLib;
				setController(instance);
				mountedMapsContext?.onMapMount(map, props.id);
			})
			.catch((error: unknown) => {
				const event = {
					type: 'error',
					target: null,
					originalEvent: null,
					error,
				};
				if (props.onError) props.onError(event);
				else console.error(error);
			});

		return () => {
			mounted = false;
			if (!instance) return;
			mountedMapsContext?.onMapUnmount(props.id);
			if (props.reuseMaps) instance.recycle();
			else instance.destroy();
			contextValueRef.current.map = null as any;
			contextValueRef.current.mapLib = null;
		};
	}, []);

	useLayoutEffect(() => {
		controller?.setProps(mapProps);
	});

	useImperativeHandle(props.ref, () => contextValueRef.current.map, [controller]);

	const style = useMemo(
		() => ({ position: 'relative', width: '100%', height: '100%', ...props.style }) as const,
		[props.style],
	);

	return (
		<div id={props.id} ref={containerRef} style={style}>
			{controller ? (
				<MapContext.Provider value={contextValueRef.current}>
					<div {...props.engine.childAttributes} style={CHILD_CONTAINER_STYLE}>
						{props.children}
					</div>
				</MapContext.Provider>
			) : null}
		</div>
	);
}

export type { MapRefLike };
