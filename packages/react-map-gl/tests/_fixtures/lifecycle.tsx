import { useMap } from '../../src/internal/context';
import { MapProvider } from '../../src/internal/context';
import { MapRoot } from '../../src/internal/map-root';
import { useControl } from '../../src/internal/components';
import type { EngineConfig, MapRefLike } from '../../src/internal/types';

function Registry() {
	const maps = useMap();
	const ids = Object.keys(maps)
		.filter((id) => id !== 'current')
		.sort();
	return <output id="registry">{ids.length ? ids.join(',') : 'none'}</output>;
}

function ProbeControl(props: { events: string[] }) {
	useControl(
		() => ({ name: 'probe' }),
		() => props.events.push('add'),
		() => props.events.push('remove'),
		{ position: 'top-left' },
	);
	return null;
}

export function LifecycleHarness(props: {
	engine: EngineConfig;
	mapLib: any;
	show: boolean;
	reuseMaps?: boolean;
	refValue?: { current: MapRefLike | null };
	controlEvents: string[];
	value: number;
}) {
	return (
		<MapProvider>
			{props.show ? (
				<MapRoot
					engine={props.engine}
					mapLib={props.mapLib}
					id="primary"
					reuseMaps={props.reuseMaps}
					ref={props.refValue}
					value={props.value}
				>
					<div id="map-child">ready</div>
					<ProbeControl events={props.controlEvents} />
				</MapRoot>
			) : null}
			<Registry />
		</MapProvider>
	);
}
