# Maintaining the boxing journey

The timeline text lives in [`src/data/boxing-journey.json`](../src/data/boxing-journey.json). Once the browser editor is connected, use **Site settings → Boxing journey** to edit the opening line, milestone periods/headings/paragraphs, or Instagram link. Milestones render in the order listed. The Boxing page heading and short description remain in **Interests and tabs**.

Keep the existing milestone IDs when editing: `first-day` attaches the January 2024 photo, `getting-serious` attaches the **2025** sparring video, and `putting-in-rounds` attaches the training still and **2026** sparring and mitt-work clips. Adding an ID creates a text milestone. To attach additional media, add the prepared assets and a corresponding media block in `BoxingJourney.astro`.

The 2027 milestone is an aspiration, not a booked fight. The current copy and dates come from Ram's supplied account. The first-day upload is a screenshot and retains its original Photos overlay; the sparring still is rendered as a landscape crop to omit its black letterboxing. Source images are preserved, with Astro generating optimized WebP output.

## Prepare training videos

The browser serves prepared MP4s from `public/media/boxing/`. The original MOV files remain outside the repository and are not modified or published. The helper requires Node 22+ and FFmpeg with `zscale`, `tonemap`, `libx264`, and AAC support. Set `FFMPEG_PATH` to a specific binary if needed.

```sh
node scripts/prepare-boxing-media.mjs /path/sparring-2026.mov /path/mitts-2026.mov /path/sparring-2025.mov
npm run build
```

The third input is optional. This helper is tailored to the supplied **HLG HDR iPhone recordings**. It bakes in rotation, tone-maps to SDR BT.709, limits dimensions to 1280, produces H.264/AAC MP4s with fast-start metadata, and extracts matching poster frames. It omits location metadata, source metadata tracks, and extra spatial-audio tracks. A clip over 20 MiB fails preparation. Do not apply the HLG conversion unchanged to ordinary SDR footage.

Prepared files are staged in the system temporary directory; the complete set is copied into `public/media/boxing/` after successful conversion. Review the outputs before committing them. Video players have `preload="none"`, visible native controls, inline playback, poster images, text descriptions, and direct-file fallback links. They do not autoplay. Full spoken-audio captions have not been transcribed.

Older training is linked at [@ramv_boxing](https://www.instagram.com/ramv_boxing/). This is an ordinary external link, so no Instagram API or account connection is required.
