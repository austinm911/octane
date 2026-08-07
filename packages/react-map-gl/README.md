# `@octanejs/react-map-gl`

Octane bindings for [`react-map-gl`](https://github.com/visgl/react-map-gl) 8.1.1.
The package keeps the Mapbox GL JS and MapLibre GL JS engines unchanged and ports
the React component layer to Octane.

```bash
pnpm add @octanejs/react-map-gl mapbox-gl
```

```tsx
import Map, {Marker, NavigationControl} from '@octanejs/react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export function PropertyMap() {
  return (
    <Map
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
      initialViewState={{longitude: -118.4695, latitude: 34.0522, zoom: 10}}
      mapStyle="mapbox://styles/mapbox/standard"
    >
      <NavigationControl position="top-right" />
      <Marker longitude={-118.4695} latitude={34.0522} />
    </Map>
  );
}
```

Use `@octanejs/react-map-gl/maplibre` with `maplibre-gl` for MapLibre. Mapbox GL JS 1.x is not supported by the initial binding; its controller and type boundary differs from the modern Mapbox implementation.

The public component names and engine-specific types mirror the pinned upstream
entry points. Refs are ordinary Octane props rather than `forwardRef` wrappers.
See `UPSTREAM.md` for the source pin, test disposition, and explicit parity gaps.

## Compatibility evidence

The pinned modern Mapbox and MapLibre component and utility cases execute in pristine React and adapted Octane full-suite lanes, with parallel public type oracles. Production Chromium tests exercise both engines with real WebGL; Mapbox uses an offline style by default and automatically exercises a hosted style when `MAPBOX_ACCESS_TOKEN` is present. See `UPSTREAM.md` for the exact inventories, classifications, and intentional gaps.
