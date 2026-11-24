/** Pure helpers shared by the YouTube synchronizer and its tests. */
export function inferPlatform(text = '') {
  if (/\bdatabricks\b|\bmlflow\b|\blakeflow\b|\blakebase\b|\bdelta lake\b/i.test(text)) return 'Databricks';
  if (/\baws\b|\bamazon\b|\bsagemaker\b|\bbedrock\b/i.test(text)) return 'AWS';
  return 'AI/ML';
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learning-path';
}

export function formatDuration(duration = '') {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return '';
  const [, h, m, s] = match;
  return h ? `${Number(h)}:${String(Number(m || 0)).padStart(2, '0')}:${String(Number(s || 0)).padStart(2, '0')}` : `${Number(m || 0)}:${String(Number(s || 0)).padStart(2, '0')}`;
}

/** YouTube paginates at 50 items. Keep playlist order and detect broken pagination. */
export async function collectPages(request, resource, parameters) {
  const items = [];
  const seen = new Set();
  let pageToken;
  do {
    const page = await request(resource, { ...parameters, maxResults: 50, ...(pageToken ? { pageToken } : {}) });
    if (!Array.isArray(page.items)) throw new Error(`Invalid ${resource} response`);
    items.push(...page.items);
    pageToken = page.nextPageToken;
    if (pageToken && seen.has(pageToken)) throw new Error('Repeated YouTube pagination token');
    if (pageToken) seen.add(pageToken);
    if (seen.size > 1000) throw new Error('YouTube pagination limit exceeded');
  } while (pageToken);
  return items;
}

export function usableVideo(item) {
  return Boolean(item?.id && item?.snippet?.title && item?.status?.privacyStatus === 'public');
}

export function normalizeVideo(item) {
  return {
    id: item.id,
    title: item.snippet.title,
    description: (item.snippet.description || '').slice(0, 600),
    publishedAt: item.snippet.publishedAt || null,
    thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    platform: inferPlatform(item.snippet.title),
    duration: formatDuration(item.contentDetails?.duration),
    embeddable: item.status?.embeddable !== false,
  };
}

export function isFreshFeed(feed, now = Date.now()) {
  const timestamp = Date.parse(feed?.fetchedAt);
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < 30 * 24 * 60 * 60 * 1000;
}

/** Select and paginate the visible view after platform and text filtering. */
export function selectLibraryItems(items, { view = 'all', platform = 'all', query = '', limit = 12 } = {}) {
  const text = query.trim().toLowerCase();
  const matching = items.filter(item => item.kind === view && (platform === 'all' || item.platform === platform) && item.search.toLowerCase().includes(text));
  const visible = view === 'all' ? matching.slice(0, Math.max(0, limit)) : matching;
  return { matching, visible, hasMore: matching.length > visible.length };
}

/** Ignore unknown URL values so a copied filter URL always has a valid state. */
export function readLibraryState(search) {
  const parameters = new URLSearchParams(search);
  const platform = parameters.get('platform') || 'all';
  return {
    view: parameters.get('view') === 'paths' ? 'paths' : 'all',
    platform: ['AWS', 'Databricks'].includes(platform) ? platform : 'all',
  };
}
