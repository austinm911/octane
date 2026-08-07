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
are vendored. `audit/upstream-tests.json` records a checked disposition, reason,
and evidence path for all 43 test artifacts; the integrity command fails if an
artifact is added, removed, duplicated, left unclassified, or marked ported
without evidence.

All applicable modern Mapbox and MapLibre utility and component cases execute
through the generic parity harness:

- the pristine React oracle runs 69 collected identities against
  `react-map-gl@8.1.1`, including all 24 modern upstream component case names in
  real Chromium/WebGL;
- the adapted Octane lane runs 68 collected identities, including the same 24
  modern component cases and the ported framework-neutral utility assertions;
- parallel repo-authored type lanes compile the same three assertion groups and
  two rejection assertions against the pinned React package and Octane, with an
  exact permitted-import transformation check;
- inventory and type-ledger negative controls reject missing, stale, duplicated,
  unclassified, or structurally drifted evidence.

The root Ocular files are orchestration rather than additional behavior. The
pinned visual-render fixtures exclusively import `mapbox-legacy`, so they are
not applicable to the initial modern-only binding. Modern production evidence
instead builds authored source with Vite and exercises real Mapbox and MapLibre
WebGL, controls, overlays, Source/Layer updates, events, resize, teardown, and
MapLibre reuse. With `MAPBOX_ACCESS_TOKEN`, the Mapbox lane loads the hosted
streets style; without it, the same always-executed test uses an offline style
and verifies that no hosted request is attempted.

Octane-only conformance, SSR, distribution, and production browser tests remain
outside the upstream-suite identity counts. `audit/react-parity.json` registers
the pristine/adapted runtime and type lanes with the repository's generic parity
runner; no unexecuted case is counted as parity evidence.
