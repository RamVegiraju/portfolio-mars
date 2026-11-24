import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-cms_oauth';
const MAX_AGE = 600;
const REPOSITORY = 'RamVegiraju/portfolio-mars';
const OWNER = 'RamVegiraju';

function configuration(env) {
  if (!env.SITE_URL || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error('CMS authentication is not configured.');
  }
  const site = new URL(env.SITE_URL);
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new Error('SITE_URL must be an HTTPS origin.');
  }
  const scope = env.GITHUB_OAUTH_SCOPE || 'public_repo';
  if (!['public_repo', 'repo'].includes(scope)) throw new Error('Invalid OAuth scope.');
  return { origin: site.origin, clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET, scope };
}

function headers(extra = {}) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

function cookie(value, maxAge = MAX_AGE) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function readSession(request, now) {
  try {
    const entry = (request.headers.get('cookie') || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
    if (!entry) return null;
    const session = JSON.parse(decodeURIComponent(entry.slice(COOKIE.length + 1)));
    if (!/^[a-f0-9]{64}$/.test(session.state) || !/^[A-Za-z0-9_-]{43}$/.test(session.verifier)) return null;
    if (!Number.isSafeInteger(session.created) || now < session.created || now - session.created > MAX_AGE * 1000) return null;
    return session;
  } catch {
    return null;
  }
}

function statesMatch(actual, expected) {
  if (!actual || !/^[a-f0-9]{64}$/.test(actual) || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function asScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Complete Decap's popup handshake only with the configured editor origin. */
export function popupDocument(origin, payload, success = true) {
  const nonce = randomBytes(18).toString('base64');
  const message = `authorization:github:${success ? 'success' : 'error'}:${JSON.stringify(payload)}`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Blog sign-in</title><body><p>Completing sign-in. You can close this window after the editor opens.</p><script nonce="${nonce}">
const editorOrigin = ${asScript(origin)};
const result = ${asScript(message)};
if (window.opener) {
  const receive = (event) => {
    if (event.origin !== editorOrigin || event.source !== window.opener || event.data !== 'authorizing:github') return;
    window.removeEventListener('message', receive);
    window.opener.postMessage(result, editorOrigin);
    window.close();
  };
  window.addEventListener('message', receive);
  window.opener.postMessage('authorizing:github', editorOrigin);
}
</script></body></html>`;
  return new Response(html, {
    status: success ? 200 : 403,
    headers: headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': cookie('', 0),
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
    }),
  });
}

function failure(message, status = 400, clear = false) {
  return new Response(message, {
    status,
    headers: headers({ 'Content-Type': 'text/plain; charset=utf-8', ...(clear ? { 'Set-Cookie': cookie('', 0) } : {}) }),
  });
}

/** Issue a short-lived state and PKCE verifier; never accept a visitor redirect URL. */
export function startAuth(request, env = process.env, now = Date.now()) {
  if (request.method !== 'GET') return failure('Method not allowed.', 405);
  let config;
  try { config = configuration(env); } catch { return failure('Blog sign-in needs hosting configuration. See docs/publishing.md.', 503); }
  const url = new URL(request.url);
  if (url.origin !== config.origin || (url.searchParams.get('provider') || 'github') !== 'github') return failure('Invalid sign-in request.');
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  const destination = new URL('https://github.com/login/oauth/authorize');
  destination.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.origin}/api/callback`,
    state,
    scope: config.scope,
    login: OWNER,
    allow_signup: 'false',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return new Response(null, { status: 302, headers: headers({ Location: destination.href, 'Set-Cookie': cookie(JSON.stringify({ state, verifier, created: now })) }) });
}

/** Exchange the code server-side, then verify both the editor identity and write access. */
export async function finishAuth(request, env = process.env, fetchImpl = fetch, now = Date.now()) {
  if (request.method !== 'GET') return failure('Method not allowed.', 405);
  let config;
  try { config = configuration(env); } catch { return failure('Blog sign-in needs hosting configuration.', 503, true); }
  const url = new URL(request.url);
  const session = readSession(request, now);
  if (url.origin !== config.origin || !session || !statesMatch(url.searchParams.get('state'), session.state)) {
    return failure('Invalid or expired sign-in state. Close this window and try again from the editor.', 403, true);
  }
  if (url.searchParams.has('error')) return popupDocument(config.origin, { message: 'GitHub sign-in was cancelled.' }, false);
  const code = url.searchParams.get('code');
  if (!code || code.length > 1024) return failure('Missing authorization code.', 400, true);
  try {
    const tokenResponse = await fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: `${config.origin}/api/callback`, code_verifier: session.verifier }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error('Token exchange failed.');
    const token = await tokenResponse.json();
    if (typeof token.access_token !== 'string' || token.error) throw new Error('Token exchange failed.');
    const apiHeaders = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'portfolio-mars-cms' };
    const userResponse = await fetchImpl('https://api.github.com/user', { headers: apiHeaders, signal: AbortSignal.timeout(10000) });
    if (!userResponse.ok) throw new Error('Identity check failed.');
    const user = await userResponse.json();
    if (typeof user.login !== 'string' || user.login.toLowerCase() !== OWNER.toLowerCase()) throw new Error('Editor not allowed.');
    const repoResponse = await fetchImpl(`https://api.github.com/repos/${REPOSITORY}`, { headers: apiHeaders, signal: AbortSignal.timeout(10000) });
    if (!repoResponse.ok) throw new Error('Repository check failed.');
    const repo = await repoResponse.json();
    if (repo.full_name?.toLowerCase() !== REPOSITORY.toLowerCase() || repo.permissions?.push !== true) throw new Error('Repository access denied.');
    return popupDocument(config.origin, { token: token.access_token, provider: 'github' });
  } catch {
    // Do not include upstream errors, tokens, or request details in HTML or logs.
    return popupDocument(config.origin, { message: 'Sign-in could not be completed. Check your GitHub account and repository access, then try again.' }, false);
  }
}
