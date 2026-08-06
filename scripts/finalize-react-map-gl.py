from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"expected one {label} in {path}, found {text.count(old)}")
    file.write_text(text.replace(old, new, 1))


apollo_marker = """\t\t\t{\n\t\t\t\ttest: {\n\t\t\t\t\tname: 'apollo-client',"""
map_project = """\t\t\t{\n\t\t\t\ttest: {\n\t\t\t\t\tname: 'react-map-gl',\n\t\t\t\t\tinclude: [\n\t\t\t\t\t\t'packages/react-map-gl/tests/**/*.test.ts',\n\t\t\t\t\t\t'packages/react-map-gl/tests/**/*.test.tsx',\n\t\t\t\t\t],\n\t\t\t\t\tenvironment: 'jsdom',\n\t\t\t\t\tglobals: false,\n\t\t\t\t},\n\t\t\t\tplugins: [octane()],\n\t\t\t},\n""" + apollo_marker
replace_once('vitest.config.js', apollo_marker, map_project, 'apollo project marker')

replace_once(
    'packages/octane-mcp-server/src/bridge.js',
    "\t'@tanstack/react-query': '@octanejs/tanstack-query',\n",
    "\t'@tanstack/react-query': '@octanejs/tanstack-query',\n\t'react-map-gl/mapbox': '@octanejs/react-map-gl',\n\t'react-map-gl/mapbox-legacy': '@octanejs/react-map-gl',\n\t'react-map-gl/maplibre': '@octanejs/react-map-gl',\n",
    'binding catalog insertion',
)
replace_once(
    'packages/octane-mcp-server/src/bridge.js',
    "\t'@tanstack/react-query': '@tanstack/query-core',\n",
    "\t'@tanstack/react-query': '@tanstack/query-core',\n\t'react-map-gl/mapbox': 'mapbox-gl',\n\t'react-map-gl/mapbox-legacy': 'mapbox-gl',\n\t'react-map-gl/maplibre': 'maplibre-gl',\n",
    'vanilla core insertion',
)

bridge_test_marker = "\n\tit('same-name hook usage stays bridgeable'"
bridge_test = """

\tit('surfaces react-map-gl bindings and their framework-neutral engines', () => {
\t\tconst mapbox = bridgeReportFromSource(`export {};`, {packageName: 'react-map-gl/mapbox'});
\t\texpect(mapbox.existingBinding).toBe('@octanejs/react-map-gl');
\t\texpect(mapbox.vanillaCore).toBe('mapbox-gl');

\t\tconst maplibre = bridgeReportFromSource(`export {};`, {packageName: 'react-map-gl/maplibre'});
\t\texpect(maplibre.existingBinding).toBe('@octanejs/react-map-gl');
\t\texpect(maplibre.vanillaCore).toBe('maplibre-gl');
\t});
""" + bridge_test_marker
replace_once('packages/octane-mcp-server/src/bridge.test.js', bridge_test_marker, bridge_test, 'bridge test marker')

llms_marker = "- **Data-heavy screens** — `@octanejs/tanstack-table`, `@octanejs/tanstack-virtual`, `@octanejs/recharts`, and `@octanejs/visx` cover tables, virtualized lists, charts, and visualization primitives.\n"
llms_replacement = llms_marker + "- **Maps and geospatial** — `@octanejs/react-map-gl` ports the Mapbox GL, MapLibre GL, and Mapbox legacy React entry points, while preserving the framework-neutral map engines.\n"
replace_once('website/public/llms.txt', llms_marker, llms_replacement, 'LLM binding summary')
