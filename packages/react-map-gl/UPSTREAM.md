# Upstream provenance: react-map-gl

## Pin

- Repository: `visgl/react-map-gl`
- Release: `v8.1.1`
- Commit: `f295bd524e01b7fc0fb9c9e9d1d5bd47b055b67d`
- Packages: `react-map-gl@8.1.1`, `@vis.gl/react-mapbox@8.1.1`, `@vis.gl/react-maplibre@8.1.1`
- Oracle engines: `mapbox-gl@3.9.0`, `maplibre-gl@5.0.0`
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

Not included in the initial binding. The pinned upstream legacy entry targets Mapbox GL JS 1.13 and has a distinct controller/type boundary; re-exporting the modern Mapbox implementation would make an unsupported compatibility claim. Legacy support requires its own implementation and oracle/browser lanes.

## Upstream test disposition

The complete upstream `modules/react-mapbox/test`,
`modules/react-maplibre/test`, legacy `modules/main/test`, and root test trees
are vendored as the future parity oracle. `audit/upstream-tests.json` records a
checked disposition and reason for all 43 upstream test artifacts; the integrity
command fails if a pinned artifact is added, removed, duplicated, or left
unclassified. Applicable cases are not yet ported or executed. The current conformance and SSR suites are Octane-owned package-contract tests and are not React-parity evidence. The production MapLibre browser fixture compiles authored package source with Vite and proves real WebGL construction, controls, Marker, Source/Layer attachment, teardown, and remount under Chromium; it is integration evidence, not a substitute for the unported upstream browser/render matrix.

Before parity can be claimed, every vendored test artifact needs a recorded
disposition, applicable controller suites must run unchanged, React component
cases must be adapted under `tests/upstream/`, and pristine/adapted runtime and
type lanes plus browser/WebGL lanes must be registered in
`audit/react-parity.json`. The first PR remains a draft until those inventories,
negative controls, engine matrix, and type-test ledger execute through the
generic parity harness. No unexecuted case is counted as parity.
