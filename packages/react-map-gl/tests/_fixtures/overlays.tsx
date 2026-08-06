/** @jsxImportSource octane */
import { MapContext } from '../../src/internal/context';
import { Marker, Popup } from '../../src/internal/components';

function Context(props: { map: any; mapLib: any; children: any }) {
	return (
		<MapContext.Provider value={{ map: { getMap: () => props.map } as any, mapLib: props.mapLib }}>
			{props.children}
		</MapContext.Provider>
	);
}

export function MarkerHarness(props: { map: any; mapLib: any }) {
	return (
		<Context map={props.map} mapLib={props.mapLib}>
			<Marker longitude={0} latitude={0} />
		</Context>
	);
}

export function PopupHarness(props: { map: any; mapLib: any; anchor: string; maxWidth?: string }) {
	return (
		<Context map={props.map} mapLib={props.mapLib}>
			<Popup longitude={0} latitude={0} anchor={props.anchor} maxWidth={props.maxWidth} />
		</Context>
	);
}
