import json
from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"expected one {label} in {path}, found {count}")
    file.write_text(text.replace(old, new, 1))


# Register a root Vitest project with the published web package replaced by the
# deterministic custom-element test double used by the package test config.
apollo_marker = """\t\t\t{\n\t\t\t\ttest: {\n\t\t\t\t\tname: 'apollo-client',"""
project = """\t\t\t{\n\t\t\t\ttest: {\n\t\t\t\t\tname: 'search-js-react',\n\t\t\t\t\tinclude: [\n\t\t\t\t\t\t'packages/search-js-react/tests/**/*.test.ts',\n\t\t\t\t\t\t'packages/search-js-react/tests/**/*.test.tsx',\n\t\t\t\t\t],\n\t\t\t\t\tenvironment: 'jsdom',\n\t\t\t\t\tglobals: false,\n\t\t\t\t},\n\t\t\t\tplugins: [octane()],\n\t\t\t\tresolve: {\n\t\t\t\t\talias: [\n\t\t\t\t\t\t{\n\t\t\t\t\t\t\tfind: /^@mapbox\\/search-js-web$/,\n\t\t\t\t\t\t\treplacement: resolve(\n\t\t\t\t\t\t\t\timport.meta.dirname,\n\t\t\t\t\t\t\t\t'packages/search-js-react/tests/fakes/search-web.ts',\n\t\t\t\t\t\t\t),\n\t\t\t\t\t\t},\n\t\t\t\t\t],\n\t\t\t\t},\n\t\t\t},\n""" + apollo_marker
replace_once('vitest.config.js', apollo_marker, project, 'apollo project marker')

# Add the binding to the existing UI category without creating an ordering
# dependency on the independent react-map-gl PR.
bindings_path = Path('website/src/content/bindings.json')
categories = json.loads(bindings_path.read_text())
ui = next(category for category in categories if category['title'] == 'UI and interaction')
package_name = '@octanejs/search-js-react'
if package_name in ui['packages']:
    raise RuntimeError(f'{package_name} is already registered')
ui['packages'].append(package_name)
ui['description'] = 'Primitives, browser hooks, positioning, motion, drag and drop, toasts, command menus, icons, keyboard shortcuts, event pacing, and Mapbox search/autofill UI.'
bindings_path.write_text(json.dumps(categories, indent=2) + '\n')

replace_once(
    'packages/octane-mcp-server/src/bridge.js',
    "\t'@tanstack/react-query': '@octanejs/tanstack-query',\n",
    "\t'@tanstack/react-query': '@octanejs/tanstack-query',\n\t'@mapbox/search-js-react': '@octanejs/search-js-react',\n",
    'binding catalog insertion',
)
replace_once(
    'packages/octane-mcp-server/src/bridge.js',
    "\t'@tanstack/react-query': '@tanstack/query-core',\n",
    "\t'@tanstack/react-query': '@tanstack/query-core',\n\t'@mapbox/search-js-react': '@mapbox/search-js-core',\n",
    'vanilla core insertion',
)

bridge_test_marker = "\n\tit('same-name hook usage stays bridgeable'"
bridge_test = """

\tit('surfaces the Search JS binding and framework-neutral core', () => {
\t\tconst report = bridgeReportFromSource(`export {};`, {
\t\t\tpackageName: '@mapbox/search-js-react',
\t\t});
\t\texpect(report.existingBinding).toBe('@octanejs/search-js-react');
\t\texpect(report.vanillaCore).toBe('@mapbox/search-js-core');
\t});
""" + bridge_test_marker
replace_once(
    'packages/octane-mcp-server/src/bridge.test.js',
    bridge_test_marker,
    bridge_test,
    'bridge test marker',
)

bindings_doc = "- [Bindings](https://octanejs.dev/docs/bindings): The `@octanejs/*` ports of the React ecosystem.\n"
replace_once(
    'website/public/llms.txt',
    bindings_doc,
    bindings_doc + "- `@octanejs/search-js-react` ports Mapbox Search JS React over the official Search JS Web custom elements and Search JS Core classes.\n",
    'LLM bindings link',
)
