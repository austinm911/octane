import MapboxMap from '@octanejs/react-map-gl/mapbox';
import MapLibreMap from '@octanejs/react-map-gl/maplibre';

export const serverEntryProof = [MapboxMap, MapLibreMap].map((component) => component.name);
