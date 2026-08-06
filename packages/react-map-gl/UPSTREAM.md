# Upstream provenance: react-map-gl

## Pin

- Repository: `visgl/react-map-gl`
- Release: `v8.1.1`
- Commit: `f295bd524e01b7fc0fb9c9e9d1d5bd47b055b67d`
- Packages: `react-map-gl@8.1.1`, `@vis.gl/react-mapbox@8.1.1`, `@vis.gl/react-maplibre@8.1.1`
- Oracle engines: `mapbox-gl@3.9.0`, `mapbox-gl@1.13.0`, `maplibre-gl@5.0.0`
- License: MIT

`pnpm upstream:sync` checks out the immutable tag, verifies the commit, vendors
its source and tests byte-for-byte under `upstream/`, copies only the
framework-neutral controller/type/utility layer into `src/engines/`, rejects an
unexpected React import at that boundary, and regenerates `SHA256SUMS`.
`pnpm upstream:check` verifies all committed evidence without network access.
The vendored tree is excluded from the published package.

## Architecture

The upstream Mapbox and MapLibre controller classes are reused byte-for-byte below a generated `@ts-nocheck` provenance marker. Upstream compiles this framework-neutral layer under package settings that are looser than Octane's repository-wide strict project; the authored Octane boundary and public API remain fully type-checked. The controllers retain controlled-camera reconciliation, style/source/layer updates, event translation, map reuse, and engine-specific public refs. The React components
are re-authored against Octane hooks, context, portals, native refs, and native
DOM events. Shared component logic is typed separately at the Mapbox and
MapLibre entry points so consumers keep the upstream engine-specific types.

## Export crosswalk

### `react-map-gl/mapbox` and `@vis.gl/react-mapbox`

| Upstream export | Disposition |
| --- | --- |
| default / `Map` / `MapProps` / `MapRef` | Ported; client-only engine construction and upstream controller reuse. |
| `Marker` / `MarkerProps` | Ported; Octane portal, native click and drag events, imperative prop synchronization. |
| `Popup` / `PopupProps` | Ported; Octane portal and upstream close-on-unmount semantics. |
| `AttributionControl`, `FullscreenControl`, `GeolocateControl`, `NavigationControl`, `ScaleControl` and props | Ported through `useControl`; latest callback props are retained. |
| `Source` / `SourceProps` | Ported; style-load lifecycle, mutable source updates, and child layer source injection. |
| `Layer` / `LayerProps` | Ported; style-load lifecycle and paint/layout/filter/zoom updates. |
| `useControl` | Ported with all three overloads. |
| `MapProvider`, `useMap` | Ported; duplicate IDs and reserved `current` behavior preserved. |
| common, event, library and style-spec type exports | Reused from the pinned framework-neutral source. |

### `react-map-gl/maplibre` and `@vis.gl/react-maplibre`

The same crosswalk applies, plus `TerrainControl` and `LogoControl`. The source
at the v8.1.1 tag does not export `GlobeControl` from its public index even
though the release changelog references it; the vendored export test is the
source of truth. Any later upstream correction belongs in an explicit version
upgrade rather than an unpinned addition here.

### `react-map-gl/mapbox-legacy`

The complete public component surface is available. The Octane binding uses the
same component implementation against the pinned `mapbox-gl@1.13.0` oracle.
React legacy implementation internals are not copied; observable compatibility
is the test target.

## Upstream test disposition

The complete upstream `modules/react-mapbox/test`,
`modules/react-maplibre/test`, and root export test trees are vendored. Ported
cases live under `tests/upstream/` and preserve upstream case names and source
citations. Framework-neutral utility/controller tests run against the copied
core. Browser/WebGL cases run in the package browser lane. React renderer,
StrictMode-only, and React ref-object implementation assertions are classified
as not applicable; their observable lifecycle behavior is covered by Octane
conformance tests instead.

The first PR intentionally remains a draft until the vendored case inventory,
negative controls, browser engine matrix, and adapted type-test ledger are all
executing in the generic parity lanes. No unexecuted case is counted as parity.
