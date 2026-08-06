import json
from pathlib import Path

path = Path("website/src/content/bindings.json")
categories = json.loads(path.read_text())
package_name = "@octanejs/react-map-gl"

if any(package_name in category["packages"] for category in categories):
    raise RuntimeError(f"{package_name} is already registered")

categories.insert(
    7,
    {
        "title": "Maps and geospatial",
        "description": "Interactive Mapbox and MapLibre maps, controls, sources, layers, markers, and popups.",
        "packages": [package_name],
    },
)
path.write_text(json.dumps(categories, indent=2) + "\n")
