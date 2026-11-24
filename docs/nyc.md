# Editing the NYC guide

The NYC page combines the supplied introduction, neighborhood history, personal favorites, optional photographs, and NYC-tagged blog posts. The current favorites arrays are intentionally empty because Ram has not supplied restaurant or nightlife names. Do not populate these with inferred preferences or generic recommendations.

## Introduction and places

Edit [`src/data/nyc.json`](../src/data/nyc.json), or use **Site settings → NYC guide** once the CMS is connected.

- `intro`: paragraphs, preserving Ram's tone. The *How I Met Your Mother* aside and the “transplant’s view and a local’s nightmare, tbf lol” line come from his supplied copy.
- `restaurants`: name, cuisine, optional neighborhood, personal note, and website/map URL. Cuisine filters are generated from the actual entries. Search covers names, cuisines, neighborhoods, and notes.
- `nightlife`: name, category (`Speakeasies & cocktails` or `Clubs & venues`), optional neighborhood, personal note, and URL. Each category has its own list.
- `moments`: image URL, alt text, and caption. The gallery appears only when photographs are added. Uploaded images can use `/images/uploads/...` paths.

For example, restaurant entries have this structure (replace with a real favorite before publishing):

```json
{
  "name": "Actual restaurant name",
  "cuisine": "Cuisine",
  "neighborhood": "Neighborhood",
  "note": "Ram’s own reason for liking it.",
  "url": "https://example.com"
}
```

The build validates required fields and nightlife categories. Empty lists may be omitted or set to `null` by the editor; the page handles those as empty. Unsafe or invalid outbound URLs are not rendered as links. Favorite entries remain fully readable without JavaScript; restaurant filtering is a progressive enhancement.

## Neighborhood history

Edit [`src/data/nyc-neighborhoods.json`](../src/data/nyc-neighborhoods.json) for the history dates and representative reference points. These describe neighborhoods, not residence locations. See [map sources and behavior](nyc-map.md) for coordinate provenance, attribution, touch behavior, and OpenStreetMap tile policy. The current map needs no API key.

## Publishing

Run `npm run check`, `npm test`, and `npm run build` after editing. Publish through the connected hosting workflow. The current static Sites preview must be republished separately from future Netlify deployments. A real browser check is still required for map tiles and mobile gestures; browser automation was unavailable during implementation.
