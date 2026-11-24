# Publishing and editor setup

The site is a static Astro build. Netlify is the configured public hosting option because it can serve both `dist/` and the two small GitHub sign-in functions. A separate static preview can show the website, but it does not make blog sign-in or publishing operational. No Netlify account, GitHub OAuth app, or production domain has been configured by these files.

## Connect production hosting

1. In Netlify, choose **Add new project → Import a Git repository**, connect GitHub, and select `RamVegiraju/portfolio-mars`. Keep the base directory empty and production branch `main`. `netlify.toml` supplies build command `npm run build`, publish directory `dist`, Node 22, and function routing.
2. Before saving personal drafts, open **Project configuration → Developer settings → Continuous deployment → Branches and deploy contexts → Configure**. Keep production branch `main`, **disable Deploy Previews**, set **Branch deploys → None**, and save. This keeps CMS branches from generating public draft previews. Details and existing-preview cleanup are below.
3. Use the assigned `https://<project-name>.netlify.app` address initially; buying a domain is optional. Set `SITE_URL` to this exact HTTPS origin, with no path or query. Use the same origin for both the website and `/admin/`; preview aliases deliberately cannot authenticate against the production configuration. If you later switch to a custom domain, update `SITE_URL` and the GitHub OAuth app's homepage/callback together.
4. Register a **GitHub OAuth App** under **GitHub Settings → Developer settings → OAuth apps → New OAuth App**. Set its homepage to `SITE_URL` and its authorization callback to `SITE_URL/api/callback`. This is a GitHub app registration, separate from the Google OAuth client shared for YouTube. Generate a client secret in the app settings.
5. Add these under **Netlify Project configuration → Environment variables**, using the **Production** deploy context:

   | Variable | Value | Scope |
   | --- | --- | --- |
   | `SITE_URL` | Exact HTTPS site origin | Builds and Functions |
   | `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | Functions |
   | `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | Functions |
   | `GITHUB_OAUTH_SCOPE` | `public_repo` while public; `repo` if private | Functions |

   `public_repo` is also the code default, so that variable is optional for the current public repository. GitHub OAuth's `repo` scope is broad; review the consent screen if enabling private-repository access. The callback independently allows only `RamVegiraju` with write permission to `RamVegiraju/portfolio-mars`. Enter secrets directly in Netlify, never in the public repository or chat, and never prefix them with `PUBLIC_`.
6. Redeploy after configuring variables. Open `SITE_URL/admin/`, sign in with GitHub, create a test draft, preview it inside the editor, then turn off **Draft — hide from website**, save, mark Ready, and Publish. Publishing merges the CMS branch into `main`; Netlify rebuilds the site from the new commit. Verify a real sign-in and test publication on the production domain before relying on the editor.

The editor uses the current website origin as its OAuth base URL. `/api/auth` redirects to GitHub; `/api/callback` exchanges the code server-side. The flow uses a short-lived secure, HttpOnly state cookie, PKCE, fixed callback origin, account/repository checks, and an exact-origin popup handshake. A missing configuration returns a setup message instead of a token. Tests exercise invalid state, unauthorized users, missing write access, and hostile popup messages.

## Draft visibility

The supplied repository is **public**. Decap's unpublished drafts live on GitHub branches and are readable there even though the website excludes drafts from pages and feeds. Before writing personal unpublished material, make the repository private or arrange a separate private content repository and update the CMS/auth configuration accordingly. This build does not change repository visibility.

**A private GitHub repository alone does not make Netlify previews private.** Saving an entry with `draft: false` before clicking Publish puts its ready-to-publish content on the CMS branch. A public Deploy Preview or branch deployment could render that content before it reaches production. Keep both **Deploy Previews disabled** and **Branch deploys set to None** as described above. The editor's built-in preview still works, and production builds from `main` continue normally. If you later enable hosted previews, protect all non-production deploys with actual access controls first; `noindex` is not access control.

Disabling previews affects new deploys only. If any previews already contain unpublished material, delete those existing deployments and their permalinks from Netlify. Avoid creating manual branch/draft deploys of unpublished content. See [Deploy Preview controls](https://docs.netlify.com/deploy/deploy-types/deploy-previews/) and [branch deploy controls](https://docs.netlify.com/deploy/deploy-types/branch-deploys/).

## Keep YouTube up to date

`YOUTUBE_API_KEY` has already been configured as a GitHub repository Actions secret for this project, so there is no additional YouTube setup required to activate the blog. If replacing it, use **GitHub repository Settings → Secrets and variables → Actions** and restrict the replacement to YouTube Data API v3 in Google Cloud. No Google OAuth login is needed for public channel videos and playlists. Rotate the key shared in conversation before production use.

The **Refresh YouTube library** Action runs every six hours or manually from the Actions tab. It calls `npm run sync:youtube` and commits only `src/data/youtube.generated.json` when changed. It never commits the key. Netlify's repository integration deploys these commits. GitHub may delay scheduled jobs; the site continues to serve its last successful library if a refresh fails. Review [YouTube setup](youtube.md) for metadata expiry and playlist selection.

Scheduled workflows require the repository's workflow permissions to allow content writes. If branch protection prevents the bot push, use a pull-request workflow or an appropriately scoped automation identity rather than removing branch protection. Do not use `[skip ci]` in metadata commits because the hosting provider should rebuild them. GitHub does not start a new Actions workflow from a push made using `GITHUB_TOKEN`; the separate Netlify integration handles deployment.

Optionally set `YOUTUBE_API_KEY` in Netlify with **Builds** scope for build-time refresh if the build script enables it. Keep all key values out of browser bundles, command arguments, repository files, and logs.

## Checks and local work

Use `npm test` for the focused security/content tests, `npm run check` for Astro/TypeScript diagnostics, and `npm run build` to generate `dist/`. The **Build and test** Action runs those checks for pushes to `main` and pull requests. Scheduled publication dates are evaluated when a static build runs; a rebuild is required for a future-dated post to appear.

`npm run dev` previews Astro pages. It does not host the Netlify OAuth functions. Use Netlify Dev with a separate local GitHub OAuth app if testing the complete function flow locally; the production handler intentionally requires HTTPS, so use an HTTPS development origin. Never reuse a production OAuth secret in a publicly shared development environment.

Sources: [Netlify repository import](https://docs.netlify.com/start/quickstarts/deploy-from-repository/), [Netlify environment variables](https://docs.netlify.com/build/environment-variables/get-started/), [creating a GitHub OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [GitHub web OAuth flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [Decap external OAuth](https://decapcms.org/docs/external-oauth-clients/).
