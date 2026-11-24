import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages, formatDuration, inferPlatform, isFreshFeed, normalizeVideo, readLibraryState, selectLibraryItems, slugify, usableVideo } from '../src/lib/youtube-utils.mjs';

test('paginates beyond the first fifty results and preserves playlist order', async () => {
  const calls = [];
  const request = async (resource, parameters) => {
    calls.push({ resource, parameters });
    return parameters.pageToken ? { items: [{ id: 'last' }] } : { items: Array.from({ length: 50 }, (_, index) => ({ id: String(index) })), nextPageToken: 'next' };
  };
  const videos = await collectPages(request, 'playlistItems', { playlistId: 'path' });
  assert.equal(videos.length, 51);
  assert.equal(videos[50].id, 'last');
  assert.equal(calls[1].parameters.pageToken, 'next');
  assert.equal(calls[0].parameters.maxResults, 50);
});

test('refuses repeated pagination tokens instead of silently looping', async () => {
  await assert.rejects(() => collectPages(async () => ({ items: [], nextPageToken: 'again' }), 'playlistItems', {}), /Repeated/);
});

test('identifies platform names without tagging unrelated short words', () => {
  assert.equal(inferPlatform('Deploying models with Amazon SageMaker'), 'AWS');
  assert.equal(inferPlatform('MLflow tracing on Databricks'), 'Databricks');
  assert.equal(inferPlatform('Draws and lessons from boxing'), 'AI/ML');
  assert.equal(inferPlatform('An introduction to machine learning'), 'AI/ML');
});

test('keeps removed and private video metadata out of the public feed', () => {
  assert.equal(usableVideo({ id: '123', snippet: { title: 'A video' }, status: { privacyStatus: 'public' } }), true);
  assert.equal(usableVideo({ id: '123', snippet: { title: 'A video' }, status: { privacyStatus: 'private' } }), false);
  assert.equal(usableVideo({ id: '123', snippet: { title: 'A video' }, status: { privacyStatus: 'unlisted' } }), false);
  assert.equal(usableVideo({ id: '123' }), false);
});

test('normalizes only known public metadata fields and preserves embed restrictions', () => {
  const video = normalizeVideo({ id: 'KB6vLQGixjA', snippet: { title: 'AWS demo', description: 'x'.repeat(1000), publishedAt: '2026-01-01T00:00:00Z' }, status: { privacyStatus: 'public', embeddable: false }, contentDetails: { duration: 'PT1H2M3S' }, privateField: 'discard' });
  assert.equal(video.description.length, 600);
  assert.equal(video.duration, '1:02:03');
  assert.equal(video.embeddable, false);
  assert.equal(video.privateField, undefined);
});

test('API feed expires at thirty days and rejects missing or future timestamps', () => {
  const now = Date.parse('2026-11-24T00:00:00Z');
  assert.equal(isFreshFeed({ fetchedAt: '2026-11-23T00:00:00Z' }, now), true);
  assert.equal(isFreshFeed({ fetchedAt: '2026-10-25T00:00:00Z' }, now), false);
  assert.equal(isFreshFeed({ fetchedAt: '2026-11-25T00:00:00Z' }, now), false);
  assert.equal(isFreshFeed({ fetchedAt: null }, now), false);
});

test('formats durations and safe stable slugs', () => {
  assert.equal(formatDuration('PT9M2S'), '9:02');
  assert.equal(formatDuration('PT43S'), '0:43');
  assert.equal(formatDuration('P0D'), '');
  assert.equal(slugify(' AWS: SageMaker / Inference! '), 'aws-sagemaker-inference');
});

const library = [
  ...Array.from({ length: 20 }, (_, index) => ({ kind: 'all', platform: index % 2 ? 'AWS' : 'Databricks', search: `Model serving lesson ${index}`, id: index })),
  { kind: 'paths', platform: 'AWS', search: 'Amazon SageMaker course', id: 'aws-path' },
  { kind: 'paths', platform: 'Databricks', search: 'MLflow on Databricks', id: 'db-path' },
];

test('filters the active view and platform before applying the video page limit', () => {
  const first = selectLibraryItems(library, { view: 'all', platform: 'AWS', limit: 3 });
  assert.equal(first.matching.length, 10);
  assert.deepEqual(first.visible.map(item => item.id), [1, 3, 5]);
  assert.equal(first.hasMore, true);
  const next = selectLibraryItems(library, { view: 'all', platform: 'AWS', limit: 12 });
  assert.equal(next.visible.length, 10);
  assert.equal(next.hasMore, false);
});

test('search is trimmed, case insensitive, and can return an empty state', () => {
  const results = selectLibraryItems(library, { view: 'paths', query: '  SAGEMAKER  ' });
  assert.deepEqual(results.visible.map(item => item.id), ['aws-path']);
  const empty = selectLibraryItems(library, { view: 'all', query: 'not available' });
  assert.deepEqual(empty.visible, []);
  assert.equal(empty.hasMore, false);
});

test('learning paths are not truncated by the video pagination limit', () => {
  assert.equal(selectLibraryItems(library, { view: 'paths', limit: 1 }).visible.length, 2);
});

test('shared filter URLs restore valid values and ignore unknown ones', () => {
  assert.deepEqual(readLibraryState('?view=paths&platform=Databricks'), { view: 'paths', platform: 'Databricks' });
  assert.deepEqual(readLibraryState('?view=unknown&platform=unknown'), { view: 'all', platform: 'all' });
});
