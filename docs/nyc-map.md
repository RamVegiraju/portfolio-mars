# NYC neighborhood map

[`NYCMap.astro`](../src/components/NYCMap.astro) renders the neighborhood history and progressively enhances it with Leaflet. Install `leaflet@1.9.4` and `@types/leaflet` in the parent project. Leaflet and its CSS are dynamically imported when the section approaches the viewport. Native buttons select an area, highlight it, fit the view, and open a name/date popup. Show all resets the view. On touch devices, dragging starts disabled so the page remains scrollable; the visitor can enable it. Wheel zoom is disabled.

The history in [`nyc-neighborhoods.json`](../src/data/nyc-neighborhoods.json) comes from Ram: Turtle Bay (2022), Murray Hill (2023–2024), Hell’s Kitchen (2024–2026), and Downtown Brooklyn (2026–Present). Dates remain readable and each location has an OpenStreetMap link if JavaScript or tile loading is unavailable. No geolocation API or address information is used.

## Geographic source

Coordinates were retrieved on November 24, 2026 from the NYC Department of City Planning's **Neighborhood Names** service, owned by `DCP_GIS` and credited to its Population Division:

- [Official ArcGIS item](https://www.arcgis.com/home/item.html?id=a0eaeedf7e574d2cbf42919e142e7ced)
- [Feature service](https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/Neighborhood_Names/FeatureServer/0)
- [NYC DCP metadata](https://www.nyc.gov/assets/planning/download/pdf/data-maps/open-data/meta_nhood.pdf)

Query used: `/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`. Selected label points were Turtle Bay (Manhattan, FID192), Murray Hill (Manhattan, FID145), Clinton (Manhattan, FID139), and Downtown (Brooklyn, FID173). The borough filter matters: the dataset also contains a Murray Hill in Queens. The city also uses [Clinton/Hell's Kitchen](https://www.nyc.gov/site/hpd/services-and-information/designated-rfp-project-details.page?request=Clinton%2FHell%27s+Kitchen+RFP&type=RFP), and [Brooklyn Community Board 2](https://cbbrooklyn.cityofnewyork.us/cb2/about/about-the-district/) identifies Downtown Brooklyn in this area.

These are representative **neighborhood label centers**, not residence coordinates. Circle radii of 450–650 meters are an editorial visualization; they do not describe official neighborhood boundaries. The visible map caption states that highlighted areas are approximate.

## Tiles and attribution

Leaflet uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, max zoom19, with visible OpenStreetMap contributor attribution. No API key is required for this standard public tile service. Respect the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): no offline downloads, bulk prefetch, or custom cache bypassing. The app uses normal browser caching and keeps the existing `strict-origin-when-cross-origin` referrer policy. A high-traffic deployment should choose an appropriate hosted tile provider rather than assuming unlimited public-server capacity. Dark mode uses a CSS filter on the tile pane; attribution, controls, and labels keep their own theme colors.

Reference: [Leaflet1.9 quick start](https://leafletjs.com/examples/quick-start/).
