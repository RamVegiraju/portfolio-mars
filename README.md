# Ram Vegiraju · Personal website

A personal home for professional work, writing, boxing, YouTube videos, and life in New York. Built with Astro, Markdown, and Decap CMS. Dark navy and copper by default, with a persistent light theme. Uses Ram's supplied portrait and resume.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Astro. Astro 7 may run development servers in the background; `npx astro dev stop` stops this project's server. The local Astro server does not run the production GitHub sign-in functions.

```sh
npm test          # publication rules, YouTube processing, OAuth security
npm run check    # Astro and TypeScript
npm run build    # static output in dist/
npm run preview  # inspect the production build locally
```

Set `SITE_URL` to the real canonical HTTPS origin before production deployment. It currently defaults to the private Sites preview origin. `npm run build` does not fetch YouTube or require credentials: it uses the checked-in public metadata snapshot.

## Features and editing

- A concise Home, a dedicated Professional page, and interest tabs starting with Boxing. Includes resume download and profile links.
- A portrait-centered homepage map with clickable Professional, Boxing, Writing, Videos, and NYC branches. Connections highlight on hover or keyboard focus; mobile uses a compact linked layout. New interests join the map automatically.
- Boxing has a personal timeline from January 2024 through the goal of a 2027 amateur fight, including the first-day photo, late-2024 and 2025 sparring clips, and 2026 sparring/mitt-work clips. The early clip includes a personal note and Instagram link for coach Scrap. Videos use native controls and load only on demand.
- Writing archive with Life, Boxing, AI/ML, and Updates filters; permanent article URLs, RSS, sitemap, and social metadata.
- Video library with All videos / Learning paths, AWS/Databricks filters, search, incremental display, and ordered playlist pages.
- Players load on click using privacy-enhanced YouTube embeds; every player has a YouTube fallback link.
- `/admin/` contains the browser editor. **Live sign-in needs Netlify and a GitHub OAuth app configured**; static Sites preview hosting does not run the Netlify functions.

To add another interest, use **Site settings → Interests and tabs** in the configured editor, or edit `src/data/interests.json`. Set a unique URL name, title, heading, topic, description, and introduction. Publishing the settings generates the new page, tab, and homepage link on the next build. Tag a post with the matching topic to show it on that interest page and in Writing. `/about/` redirects to Home.

Read [blog editing](docs/blog.md), [YouTube syncing](docs/youtube.md), [boxing timeline and media](docs/boxing.md), and [production publishing](docs/publishing.md) for the exact workflows. The initial journal introduction is starter copy for review, not a collection of invented personal essays. The example draft is excluded from the public build.

The GitHub repository is currently **public**. Unpublished Decap drafts are stored on repository branches and can be read on GitHub. Use a private repository or configure a private content repository before adding private drafts. The source remains public unless you choose to change it.

## YouTube data

The first successful sync retrieved **152 public videos and 11 AWS/Databricks learning paths** from `@RamVegiraju`. Playlist content and order are maintained on YouTube. Playlist selection can be overridden in [youtube.config.json](src/data/youtube.config.json).

Supply `YOUTUBE_API_KEY` through your shell environment or a secret manager, then run:

```sh
npm run sync:youtube
npm run build
```

No Google OAuth client is required for public metadata. Never put the key in source, browser JavaScript, command arguments, or committed `.env` files. The repository's `YOUTUBE_API_KEY` Actions secret has been configured; the scheduled workflow refreshes public metadata every six hours. Renew that secret if you rotate the key. Failed syncs leave the last successful snapshot intact; snapshots older than 30 days are excluded on the next build. A public Netlify deployment rebuilds when the metadata commit arrives; the private Sites preview is a separate deployment and must be republished to receive changes.

## File purposes

| File or directory | Purpose |
| --- | --- |
| [src/pages/index.astro](src/pages/index.astro) | Short personal introduction, recent writing, featured video, and links to work and interests. |
| [src/pages/professional.astro](src/pages/professional.astro) | Resume-based career summaries, categorized tech stack, education, teaching, and resume links. |
| [src/pages/[interest].astro](src/pages/[interest].astro) | Generates each interest page with its introduction and matching published posts. |
| [src/data/interests.json](src/data/interests.json) | Editable interest definitions; each entry creates a page, navigation tab, and homepage link. |
| [src/data/navigation.ts](src/data/navigation.ts) | Shared primary navigation built from the fixed pages and editable interests. |
| [src/pages/writing/](src/pages/writing/) | Writing archive and published article routes. |
| [src/pages/videos/](src/pages/videos/) | Video browser and ordered learning-path pages. |
| [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) | Shared navigation, metadata, theme toggle, and footer. |
| [src/styles/global.css](src/styles/global.css) | Dark/light tokens, typography, responsive shared styles. |
| [src/content/posts/](src/content/posts/) | Editable Markdown posts and example draft. |
| [src/content.config.ts](src/content.config.ts) | Validated post metadata and content collection. |
| [src/content/publication.ts](src/content/publication.ts) | Shared draft and publication-date rule. |
| [src/pages/rss.xml.ts](src/pages/rss.xml.ts) | Published-post RSS feed. |
| [src/components/VideoCard.astro](src/components/VideoCard.astro) | Accessible click-to-load video player and metadata. |
| [src/components/InterestMap.astro](src/components/InterestMap.astro) | Responsive portrait-centered navigation diagram, generated from shared interests. |
| [src/components/BoxingJourney.astro](src/components/BoxingJourney.astro) | Boxing timeline, supplied photographs, training video players, and Instagram archive link. |
| [src/data/boxing-journey.json](src/data/boxing-journey.json) | Editable timeline text, milestone dates, and Instagram link. |
| [src/assets/profile.png](src/assets/profile.png) | Supplied original portrait; Astro generates optimized WebP versions for the map and social previews. |
| [src/assets/boxing/](src/assets/boxing/) | Supplied first-day and sparring photographs; Astro generates optimized images. |
| [public/media/boxing/](public/media/boxing/) | **Generated:** browser-compatible training MP4s and poster images. |
| [scripts/prepare-boxing-media.mjs](scripts/prepare-boxing-media.mjs) | Converts the supplied HLG iPhone clips to SDR H.264/AAC MP4s with fast-start playback; strips private metadata. |
| [src/lib/youtube.ts](src/lib/youtube.ts) | Typed, freshness-checked video data and curated fallback. |
| [src/lib/youtube-utils.mjs](src/lib/youtube-utils.mjs) | Pagination, platform labels, normalization, and metadata expiry. |
| [src/data/youtube.config.json](src/data/youtube.config.json) | Channel and learning-path selection configuration. |
| [src/data/youtube.generated.json](src/data/youtube.generated.json) | **Generated:** sanitized public YouTube metadata; refresh with the sync script. |
| [scripts/sync-youtube.mjs](scripts/sync-youtube.mjs) | Fetches all public uploads and chosen playlists; atomically updates the snapshot. |
| [scripts/verify-build.mjs](scripts/verify-build.mjs) | Checks built pages for broken local links, page landmarks, credential patterns, and leaked drafts. |
| [public/admin/](public/admin/) | Decap browser editor, fields, and preview styles. |
| [public/resume.pdf](public/resume.pdf) | Downloadable supplied resume. |
| [public/images/](public/images/) | Original GitHub avatar retained as an asset, and future post uploads. |
| [netlify/](netlify/) | Server-side GitHub OAuth flow for the blog editor. |
| [netlify.toml](netlify.toml) | Public hosting build, function routes, and response headers. |
| [.github/workflows/](.github/workflows/) | CI checks and scheduled YouTube metadata refresh. |
| [tests/](tests/) | Focused OAuth, video-data, and video-library regression tests. |
| [docs/](docs/) | Authoring, video management, and deployment setup. |
| [astro.config.mjs](astro.config.mjs) | Static build, canonical origin, and sitemap integration. |
| [.env.example](.env.example) | Variable names and placeholders only. |
| [.openai/hosting.json](.openai/hosting.json) | Private Sites preview identity and static-output configuration. |
| [package.json](package.json), [package-lock.json](package-lock.json) | Commands, dependencies, and **generated** dependency lock. |
| `dist/`, `.astro/`, `node_modules/` | **Generated and ignored:** build output, Astro metadata, dependencies. |

## Verification limits

Production build, type checking, draft exclusion, metadata pagination, and OAuth unit tests are automated. A GitHub OAuth app and Netlify account connection are still required to activate and test real editor publishing. Browser automation was unavailable during the initial build, so visual mobile/desktop review and actual video playback remain manual checks.
