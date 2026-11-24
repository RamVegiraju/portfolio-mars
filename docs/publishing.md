# Publishing and editor setup

The site is a static Astro build. Netlify is the configured public hosting option because it can serve both `dist/` and the two small GitHub sign-in functions. A separate static preview can show the website, but it does not make blog sign-in or publishing operational. No Netlify account, GitHub OAuth app, or production domain has been configured by these files.

## Connect production hosting

1. Import `RamVegiraju/portfolio-mars` into Netlify with production branch `main`. `netlify.toml` supplies `npm run build`, publish directory `dist`, Node 22, and function routing.
2. Set `SITE_URL` to the final HTTPS origin, such as `https://your-domain.example`, with no path or query. Use the same origin for both the website and `/admin/`; preview aliases deliberately cannot authenticate against the production configuration.
3. Register a **GitHub OAuth App** in GitHub Developer Settings. Set its homepage to `SITE_URL` and its authorization callback to `SITE_URL/api/callback`. This is a GitHub app registration, separate from the Google OAuth client shared for YouTube.
4. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Netlify environment variables with **Functions** scope. Add `SITE_URL` for both **Builds** and **Functions**. Do not commit these values or prefix secrets with `PUBLIC_`.
5. Leave `GITHUB_OAUTH_SCOPE=public_repo` for the current public repository. If the repository becomes private, set it to `repo` and sign in again to grant the required access. GitHub OAuth's `repo` scope is broad; review the consent screen. The callback independently allows only `RamVegiraju` with write permission to `RamVegiraju/portfolio-mars`.
6. Redeploy after configuring variables. Open `/admin/`, sign in with GitHub, create a draft, preview it, and publish. Publishing merges the CMS branch into `main`; Netlify rebuilds the site from the new commit. Verify a real sign-in on the production domain before relying on the editor.

The editor uses the current website origin as its OAuth base URL. `/api/auth` redirects to GitHub; `/api/callback` exchanges the code server-side. The flow uses a short-lived secure, HttpOnly state cookie, PKCE, fixed callback origin, account/repository checks, and an exact-origin popup handshake. A missing configuration returns a setup message instead of a token. Tests exercise invalid state, unauthorized users, missing write access, and hostile popup messages.

## Draft visibility

The supplied repository is **public**. Decap's unpublished drafts live on GitHub branches and are readable there even though the website excludes drafts from pages and feeds. Before writing personal unpublished material, make the repository private or arrange a separate private content repository and update the CMS/auth configuration accordingly. This build does not change repository visibility. Deploy previews containing drafts must also remain private.

## Keep YouTube up to date

Add `YOUTUBE_API_KEY` under **GitHub repository Settings → Secrets and variables → Actions → New repository secret**. Restrict the key to YouTube Data API v3 in Google Cloud. No Google OAuth login is needed for public channel videos and playlists. Rotate the key shared in conversation before production use.

The **Refresh YouTube library** Action runs every six hours or manually from the Actions tab. It calls `npm run sync:youtube` and commits only `src/data/youtube.generated.json` when changed. It never commits the key. Netlify's repository integration deploys these commits. GitHub may delay scheduled jobs; the site continues to serve its last successful library if a refresh fails. Review [YouTube setup](youtube.md) for metadata expiry and playlist selection.

Scheduled workflows require the repository's workflow permissions to allow content writes. If branch protection prevents the bot push, use a pull-request workflow or an appropriately scoped automation identity rather than removing branch protection. Do not use `[skip ci]` in metadata commits because the hosting provider should rebuild them. GitHub does not start a new Actions workflow from a push made using `GITHUB_TOKEN`; the separate Netlify integration handles deployment.

Optionally set `YOUTUBE_API_KEY` in Netlify with **Builds** scope for build-time refresh if the build script enables it. Keep all key values out of browser bundles, command arguments, repository files, and logs.

## Checks and local work

Use `npm test` for the focused security/content tests, `npm run check` for Astro/TypeScript diagnostics, and `npm run build` to generate `dist/`. The **Build and test** Action runs those checks for pushes to `main` and pull requests. Scheduled publication dates are evaluated when a static build runs; a rebuild is required for a future-dated post to appear.

`npm run dev` previews Astro pages. It does not host the Netlify OAuth functions. Use Netlify Dev with a separate local GitHub OAuth app if testing the complete function flow locally; the production handler intentionally requires HTTPS, so use an HTTPS development origin. Never reuse a production OAuth secret in a publicly shared development environment.

Sources: [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [GitHub web OAuth flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [Decap external OAuth](https://decapcms.org/docs/external-oauth-clients/).
