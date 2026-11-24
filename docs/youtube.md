# YouTube library

The library has **All videos** and **Learning paths** views, AWS/Databricks filters, title/description search, and ordered playlist pages. Players are created only after clicking Play and use privacy-enhanced YouTube embeds. Thumbnails still load from YouTube. Every video includes a YouTube fallback link; some videos may require playback there.

Without JavaScript, the page shows the full video and learning-path archives, hides interactive filters, and opens each poster on YouTube. With JavaScript, it restores shared view/platform URL parameters and paginates filtered results twelve at a time.

## Refresh the channel

Prerequisites: Node.js 22+, a Google Cloud project with YouTube Data API v3 enabled, and a restricted API key configured as `YOUTUBE_API_KEY` in the shell or hosting secrets. Public channel metadata does not need OAuth. Never put the key in source files, URLs, or a public environment variable.

```sh
npm run sync:youtube
```

The underlying command is `node scripts/sync-youtube.mjs`. Add `--required` to fail when no API key is configured. Without a key, a normal sync skips the API and retains the existing feed. With a key, API/network failures return a nonzero exit code and leave the prior feed unchanged. The synchronizer follows all pages of uploads and public playlists, verifies public video metadata, and atomically replaces `src/data/youtube.generated.json` only after every request succeeds. API keys go in a request header, never a query string.

Run synchronization before a production build and on a daily scheduled rebuild. Publishing a new YouTube video or changing playlist order appears on the website after its next successful sync/build/deployment, not immediately. A static deployed site cannot update itself without that workflow.

API-derived metadata older than 30 days is excluded on the next build, falling back to the hand-picked resume talk and channel link. A successful daily workflow keeps the deployed feed fresh; if scheduled deployments stop, the deployed static HTML also stops refreshing. Monitor workflow failures and remove or refresh stale deployments. The source JSON is a generated cache, not an indefinite content archive; delete it or refresh it if synchronization remains disabled.

## Select learning paths

Edit `src/data/youtube.config.json`. By default, channel playlists whose titles mention AWS, Amazon, SageMaker, Bedrock, Databricks, MLflow, Lakeflow, or Lakebase become learning paths. Turn `autoDiscoverLearningPaths` off to show only explicitly selected playlists.

An override can customize a real playlist without changing its YouTube title:

```json
{
  "playlistId": "YOUR_REAL_PLAYLIST_ID",
  "slug": "aws-model-serving",
  "title": "Model serving on AWS",
  "platform": "AWS",
  "description": "A description you write for this playlist.",
  "audience": "Who this path is for.",
  "prerequisites": "What to know before watching."
}
```

Add this object to `learningPaths`, then sync and rebuild. Lesson order comes directly from YouTube Studio. Deleted/private videos are omitted; public videos with embedding disabled retain a YouTube link. A video can appear in more than one path.

## Files

| File | Purpose |
| --- | --- |
| [`src/data/youtube.config.json`](../src/data/youtube.config.json) | Channel and editorial learning-path selection. |
| [`src/data/youtube.generated.json`](../src/data/youtube.generated.json) | **Generated:** sanitized public API metadata, safe to commit. Contains no key. |
| [`scripts/sync-youtube.mjs`](../scripts/sync-youtube.mjs) | Build-time API synchronization and atomic cache replacement. |
| [`src/lib/youtube.ts`](../src/lib/youtube.ts) | Typed feed exports, thirty-day freshness check, and editorial fallback. |
| [`src/components/VideoCard.astro`](../src/components/VideoCard.astro) | Click-to-load player and fallback link. |
| [`src/pages/videos/`](../src/pages/videos/) | Browsable library and ordered learning paths. |
| [`tests/youtube.test.mjs`](../tests/youtube.test.mjs) | Pagination, privacy, freshness, normalization, and classification checks. |

## Verification

```sh
node --test tests/youtube.test.mjs
```

Verify playback on the final HTTP/HTTPS domain. Preserve the HTTP Referer (the player uses `strict-origin-when-cross-origin`); strict `no-referrer` policies can break YouTube playback. Ordinary embedded players need no IFrame Player API script.

Sources: [channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list), [playlistItems.list](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list), [IFrame requirements](https://developers.google.com/youtube/iframe_api_reference), and [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies).
