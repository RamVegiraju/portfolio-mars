# Writing and publishing

The site stores posts as Markdown in [`src/content/posts`](../src/content/posts/). The same files can be edited in the browser through `/admin/` or with a text editor. Images uploaded through the editor are committed under `public/images/uploads/`.

## One-time setup

The browser editor uses the GitHub backend for `RamVegiraju/portfolio-mars`, branch `main`. Its OAuth endpoints are `/api/auth` and `/api/callback`; see the deployment guide for GitHub OAuth and hosting configuration. The editor chooses its current origin as the OAuth base URL. `SITE_URL` on the OAuth host must match that origin. A static preview without those server endpoints can display the editor but cannot complete GitHub sign-in.

The repository is currently **public**. Draft files, editorial branches, pull requests, and uploaded images can be read on GitHub even when they are excluded from the website. Make the repository private before storing private personal drafts. The included draft is only an example, with no personal essay content. Moving already committed material into a private repository does not recall existing public copies.

## Publish from a browser

1. Open `https://your-domain/admin/` and sign in with the authorized GitHub account.
2. Choose **Writing**, then **New Post**. Add a title, short description, date, and one or more topics.
3. Write in the Markdown or rich-text editor. Upload images with the image controls. The preview uses the site's article colors and typography; it is an editorial preview, not the complete page with navigation.
4. Leave **Draft — hide from website** enabled while writing, then save. Decap keeps the entry in its editorial workflow.
5. When ready, turn Draft off and save, mark the entry **Ready**, and choose **Publish**. A publish guard rejects entries still marked Draft.
6. Publishing merges the content to `main`. Connected hosting builds the site; wait for that deployment to finish before sharing the URL.

The post date uses UTC. A future-dated post stays out of the article routes, homepage, writing archive, and RSS until a site build runs at or after its date. This static site does not publish just because the clock passes the date: trigger a new build, or configure scheduled builds. Prefer a current date and explicit Publish unless scheduling has been connected.

## Publish from Markdown

Create a file such as `src/content/posts/a-new-post.md`:

```md
---
title: A new post
description: A concise summary of the post.
date: 2026-11-24T15:00:00Z
topics:
  - Life
draft: true
---

Write your post here.
```

Start with topics such as `Life`, `Boxing`, `AI/ML`, and `Updates`. You can also add new topics; the Writing filters include configured interests and topics from published posts. Optional fields are `image` (for example `/images/uploads/photo.jpg`) and `imageAlt`. Filenames become permanent URLs such as `/writing/a-new-post/`; avoid renaming published files without adding a redirect.

Preview locally using the README's commands. Set `draft: false` only when ready, commit the file, and push to `main`. Do not put credentials, private notes, or sensitive image metadata into published content.

## Publication checks

[`publication.ts`](../src/content/publication.ts) is shared by the homepage, archive, article routes, and RSS. Only posts explicitly marked `draft: false` with dates at or before the build time are public. Missing Draft values default to true in the schema. Run its regression test with Node 22:

```sh
node --experimental-strip-types --test src/content/publication.test.mjs
```

The test covers published, draft, missing-status, future, and invalid-date entries. Building the site additionally validates all post metadata through Astro's content schema.

References: [Decap GitHub backend](https://decapcms.org/docs/github-backend/), [editorial workflow](https://decapcms.org/docs/editorial-workflows/), [Astro content collections](https://docs.astro.build/en/guides/content-collections/).

## Add an interest and a tab

Open **Site settings → Interests and tabs** in the configured editor. Add an interest with a title, unique URL name, page heading, matching blog topic, short description, and introduction. Save and publish the settings. The next build creates a dedicated page, adds its navigation tab, and links it from Home.

For example, an interest titled `Cooking` with URL name `cooking` and topic `Cooking` creates `/cooking/`. Published posts tagged `Cooking` appear there automatically, while remaining in Writing. Use the same topic spelling and capitalization. Until you publish matching posts, the page shows its introduction and an honest empty state. No duplicate posts are needed.

The same settings can be edited directly in [`src/data/interests.json`](../src/data/interests.json). URL names must be unique, lowercase words separated by hyphens. Reserved page names such as `professional`, `writing`, `videos`, `about`, `admin`, and `api` cannot be used. Avoid changing an existing URL after sharing it. Navigation handles additional tabs by wrapping on desktop and scrolling on smaller screens.
