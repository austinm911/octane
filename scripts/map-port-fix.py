from pathlib import Path


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"missing expected {label}")
    return text.replace(old, new)


sync = Path("packages/react-map-gl/scripts/sync-upstream.mjs")
text = sync.read_text()
text = replace_required(
    text,
    "cpSync(source, destination, {recursive: true, force: true});",
    "cpSync(source, destination, {recursive: true, force: true, dereference: true});",
    "copy helper",
)
text = replace_required(
    text,
    "for (const file of ['CHANGELOG.md', 'package.json', 'vitest.config.ts']) {",
    "for (const file of ['README.md', 'CHANGELOG.md', 'package.json', 'vitest.config.ts']) {",
    "root evidence list",
)
old_loop = '''    for (const file of walk(destinationRoot)) {
      if (!/\\.[cm]?[jt]sx?$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (!/from ['"]react(?:-dom)?['"]/.test(text) && !/import \\* as React from ['"]react['"]/.test(text)) {
        continue;
      }
      const name = relative(destinationRoot, file).replaceAll('\\\\', '/');
      if (name === 'utils/apply-react-style.ts' || name === 'utils/use-isomorphic-layout-effect.ts') {
        rmSync(file);
        continue;
      }
      throw new Error(`Unexpected React dependency in reusable engine source: ${engineName}/${name}`);
    }
'''
new_loop = '''    for (const file of walk(destinationRoot)) {
      if (!/\\.[cm]?[jt]sx?$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      const name = relative(destinationRoot, file).replaceAll('\\\\', '/');
      if (/from ['"]react(?:-dom)?['"]/.test(text) || /import \\* as React from ['"]react['"]/.test(text)) {
        if (name === 'utils/apply-react-style.ts' || name === 'utils/use-isomorphic-layout-effect.ts') {
          rmSync(file);
          continue;
        }
        throw new Error(`Unexpected React dependency in reusable engine source: ${engineName}/${name}`);
      }
      writeFileSync(
        file,
        `// @ts-nocheck -- pinned framework-neutral react-map-gl ${TAG} source; see UPSTREAM.md\\n${text}`,
      );
    }
'''
text = replace_required(text, old_loop, new_loop, "engine validation loop")
sync.write_text(text)

types = Path("packages/react-map-gl/src/internal/types.ts")
text = types.read_text()
text = replace_required(
    text,
    "export type RefLike<T> =\n  | ((value: T | null) => void)\n  | {current: T | null}\n  | readonly RefLike<T>[]\n  | null\n  | undefined;",
    "export type RefLike<T> = ((value: T | null) => void) | {current: T | null} | null | undefined;",
    "RefLike declaration",
)
types.write_text(text)

root = Path("packages/react-map-gl/src/internal/map-root.tsx")
text = root.read_text()
text = replace_required(
    text,
    "const CHILD_CONTAINER_STYLE = {height: '100%'};",
    "const CHILD_CONTAINER_STYLE = {height: '100%'} as const;",
    "child style literal",
)
text = replace_required(
    text,
    "  const style = useMemo(\n    () => ({position: 'relative', width: '100%', height: '100%', ...props.style}),\n    [props.style],\n  );",
    "  const style = useMemo(\n    () => ({position: 'relative', width: '100%', height: '100%', ...props.style}) as const,\n    [props.style],\n  );",
    "map root style",
)
root.write_text(text)

maplibre = Path("packages/react-map-gl/src/maplibre.tsx")
text = maplibre.read_text()
text = replace_required(text, "  TerrainControlOptions,\n", "", "obsolete terrain options import")
text = replace_required(
    text,
    "  SourceSpecification,\n",
    "  SourceSpecification,\n  TerrainSpecification,\n",
    "terrain specification import",
)
text = replace_required(
    text,
    "export type TerrainControlProps = TerrainControlOptions & StyledControlProps;",
    "export type TerrainControlProps = TerrainSpecification & StyledControlProps;",
    "terrain control props",
)
maplibre.write_text(text)

upstream = Path("packages/react-map-gl/UPSTREAM.md")
text = upstream.read_text()
text = replace_required(
    text,
    "The upstream Mapbox and MapLibre controller classes are reused byte-for-byte.\nThey retain controlled-camera reconciliation, style/source/layer updates, event\ntranslation, map reuse, and engine-specific public refs.",
    "The upstream Mapbox and MapLibre controller classes are reused byte-for-byte below a generated `@ts-nocheck` provenance marker. Upstream compiles this framework-neutral layer under package settings that are looser than Octane's repository-wide strict project; the authored Octane boundary and public API remain fully type-checked. The controllers retain controlled-camera reconciliation, style/source/layer updates, event translation, map reuse, and engine-specific public refs.",
    "upstream strict-boundary note",
)
upstream.write_text(text)

overload_start = "export const useControl = useInternalControl as {"
overload_end = "\n\nexport type {MapRef, CSSProperties, RefLike};"
widened = '''export const useControl = useInternalControl as <T extends IControl>(
  onCreate: (context: MapContextValue) => T,
  onAddOrRemoveOrOptions?:
    | ((context: MapContextValue) => void)
    | {position?: ControlPosition},
  onRemoveOrOptions?:
    | ((context: MapContextValue) => void)
    | {position?: ControlPosition},
  options?: {position?: ControlPosition},
) => T;'''
for entry in ("mapbox.tsx", "maplibre.tsx"):
    public = Path("packages/react-map-gl/src") / entry
    source = public.read_text()
    start = source.find(overload_start)
    end = source.find(overload_end, start)
    if start < 0 or end < 0:
        raise RuntimeError(f"missing useControl overload in {entry}")
    public.write_text(source[:start] + widened + source[end:])

lifecycle = Path("packages/react-map-gl/tests/conformance/lifecycle.test.tsx")
text = lifecycle.read_text()
text = replace_required(
    text,
    "import {LifecycleHarness} from '../_fixtures/lifecycle';",
    "import {LifecycleHarness} from '../_fixtures/lifecycle';\nimport {MapRoot} from '../../src/internal/map-root';",
    "MapRoot test import",
)
text = replace_required(
    text,
    "    flushEffects();\n    expect(controller.destroy).toHaveBeenCalledTimes(1);",
    "    await settle();\n    expect(controller.destroy).toHaveBeenCalledTimes(1);",
    "provider unmount settling",
)
lifecycle.write_text(text)
