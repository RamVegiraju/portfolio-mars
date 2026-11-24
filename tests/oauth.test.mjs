import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { finishAuth, popupDocument, startAuth } from '../netlify/lib/oauth.mjs';

const env = { SITE_URL: 'https://ram.example', GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret' };
const now = 1800000000000;

function start() {
  const response = startAuth(new Request('https://ram.example/api/auth?provider=github'), env, now);
  const location = new URL(response.headers.get('Location'));
  return { response, location, cookie: response.headers.get('Set-Cookie').split(';')[0] };
}

function callback(state, cookie) {
  return new Request(`https://ram.example/api/callback?state=${encodeURIComponent(state)}&code=test-code`, { headers: { cookie } });
}

function mockGithub({ login = 'RamVegiraju', push = true } = {}) {
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/access_token')) return Response.json({ access_token: 'test-access-token' });
    if (url.endsWith('/user')) return Response.json({ login });
    if (url.endsWith('/repos/RamVegiraju/portfolio-mars')) return Response.json({ full_name: 'RamVegiraju/portfolio-mars', permissions: { push } });
    throw new Error('Unexpected request');
  };
  return { fetchMock, calls };
}

test('authorization uses a fixed callback, CSRF cookie, and PKCE', () => {
  const { response, location } = start();
  assert.equal(response.status, 302);
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://ram.example/api/callback');
  assert.equal(location.searchParams.get('scope'), 'public_repo');
  assert.match(location.searchParams.get('state'), /^[a-f0-9]{64}$/);
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.match(location.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.match(response.headers.get('Set-Cookie'), /^__Host-cms_oauth=.*; Path=\//);
  assert.equal(response.headers.get('Cache-Control'), 'no-store, max-age=0');
  assert.notEqual(location.searchParams.get('state'), start().location.searchParams.get('state'));
});

test('unconfigured, insecure, foreign-origin and unsupported-provider requests fail closed', () => {
  assert.equal(startAuth(new Request('https://ram.example/api/auth'), {}).status, 503);
  assert.equal(startAuth(new Request('https://ram.example/api/auth'), { ...env, SITE_URL: 'http://ram.example' }).status, 503);
  assert.equal(startAuth(new Request('https://evil.example/api/auth'), env).status, 400);
  assert.equal(startAuth(new Request('https://ram.example/api/auth?provider=gitlab'), env).status, 400);
  assert.equal(startAuth(new Request('https://ram.example/api/auth'), { ...env, GITHUB_OAUTH_SCOPE: 'admin:org' }).status, 503);
});

test('visitors cannot broaden the configured public-repository scope or override the callback', () => {
  const response = startAuth(new Request('https://ram.example/api/auth?scope=repo&redirect_uri=https://evil.example/callback'), env, now);
  const location = new URL(response.headers.get('Location'));
  assert.equal(location.searchParams.get('scope'), 'public_repo');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://ram.example/api/callback');
});

test('missing, tampered, malformed and expired state never reaches GitHub', async () => {
  const { location, cookie } = start();
  let calls = 0;
  const noFetch = async () => { calls++; throw new Error('Must not fetch'); };
  for (const [state, cookies, time] of [
    ['wrong', cookie, now],
    ['💥'.repeat(32), cookie, now],
    [location.searchParams.get('state'), '', now],
    [location.searchParams.get('state'), '__Host-cms_oauth=broken', now],
    [location.searchParams.get('state'), cookie, now + 601000],
  ]) {
    const response = await finishAuth(callback(state, cookies), env, noFetch, time);
    assert.equal(response.status, 403);
    assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  }
  assert.equal(calls, 0);
});

test('successful sign-in validates identity and repo write access before returning token', async () => {
  const { location, cookie } = start();
  const { fetchMock, calls } = mockGithub();
  const response = await finishAuth(callback(location.searchParams.get('state'), cookie), env, fetchMock, now);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /test-access-token/);
  assert.match(html, /authorization:github:success:/);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.body.get('redirect_uri'), 'https://ram.example/api/callback');
  assert.match(calls[0].options.body.get('code_verifier'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(calls[0].options.body.get('client_secret'), env.GITHUB_CLIENT_SECRET);
  assert.equal(html.includes(env.GITHUB_CLIENT_SECRET), false);
  assert.match(response.headers.get('Content-Security-Policy'), /default-src 'none'/);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
});

test('callback refuses a different deployment origin even with a matching cookie and state', async () => {
  const { location, cookie } = start();
  let calls = 0;
  const request = new Request(`https://preview.example/api/callback?state=${location.searchParams.get('state')}&code=test-code`, { headers: { cookie } });
  const response = await finishAuth(request, env, async () => { calls++; }, now);
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('other accounts and read-only repository permissions never receive a token', async () => {
  for (const scenario of [{ login: 'someone-else' }, { push: false }]) {
    const { location, cookie } = start();
    const { fetchMock } = mockGithub(scenario);
    const response = await finishAuth(callback(location.searchParams.get('state'), cookie), env, fetchMock, now);
    const html = await response.text();
    assert.equal(response.status, 403);
    assert.match(html, /authorization:github:error:/);
    assert.equal(html.includes('test-access-token'), false);
  }
});

test('popup ignores wrong origin, window, and handshake before posting to exact editor origin', async () => {
  const response = popupDocument(env.SITE_URL, { token: 'value</script><script>bad()</script>', provider: 'github' });
  const html = await response.text();
  assert.equal(html.includes('value</script>'), false);
  const script = html.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/)[1];
  const listeners = new Map();
  const posts = [];
  const opener = { postMessage: (...args) => posts.push(args) };
  let closed = 0;
  const window = { opener, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => listeners.delete(type), close: () => closed++ };
  runInNewContext(script, { window });
  assert.deepEqual(posts[0], ['authorizing:github', env.SITE_URL]);
  const receive = listeners.get('message');
  receive({ origin: 'https://evil.example', source: opener, data: 'authorizing:github' });
  receive({ origin: env.SITE_URL, source: {}, data: 'authorizing:github' });
  receive({ origin: env.SITE_URL, source: opener, data: 'other-message' });
  assert.equal(posts.length, 1);
  receive({ origin: env.SITE_URL, source: opener, data: 'authorizing:github' });
  assert.equal(posts.length, 2);
  assert.equal(posts[1][1], env.SITE_URL);
  assert.match(posts[1][0], /^authorization:github:success:/);
  assert.equal(closed, 1);
  assert.equal(listeners.has('message'), false);
});
