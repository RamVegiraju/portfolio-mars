#!/usr/bin/env node
/** Refresh public channel metadata. Input: YOUTUBE_API_KEY env. Writes only sanitized public metadata atomically. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { collectPages, inferPlatform, normalizeVideo, slugify, usableVideo } from '../src/lib/youtube-utils.mjs';

const destination = fileURLToPath(new URL('../src/data/youtube.generated.json', import.meta.url));
const config = JSON.parse(await readFile(new URL('../src/data/youtube.config.json', import.meta.url), 'utf8'));
const key = process.env.YOUTUBE_API_KEY;

if (!key) {
  console.log('YouTube sync skipped: YOUTUBE_API_KEY is not configured. Using the existing feed or curated fallback.');
  if (process.argv.includes('--required')) process.exitCode = 1;
} else {
  const request = async (resource, parameters) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, String(value));
    const response = await fetch(url, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`YouTube ${resource} request failed (HTTP ${response.status}). Check API enablement, restrictions, and quota.`);
    return response.json();
  };

  try {
    const channelResponse = await request('channels', { part: 'contentDetails', forHandle: config.handle });
    const channel = channelResponse.items?.[0];
    if (!channel?.id || !channel.contentDetails?.relatedPlaylists?.uploads) throw new Error('YouTube channel or uploads playlist was not found.');

    const uploadedItems = await collectPages(request, 'playlistItems', { part: 'snippet,contentDetails', playlistId: channel.contentDetails.relatedPlaylists.uploads });
    const channelPlaylists = await collectPages(request, 'playlists', { part: 'snippet,contentDetails', channelId: channel.id });
    const overrides = new Map(config.learningPaths.map(path => [path.playlistId, path]));
    const selected = channelPlaylists.filter(playlist => overrides.has(playlist.id) || (config.autoDiscoverLearningPaths && inferPlatform(playlist.snippet.title) !== 'AI/ML'));
    // Explicit IDs can include an unlisted playlist supplied by its owner.
    for (const override of config.learningPaths) {
      if (!selected.some(playlist => playlist.id === override.playlistId)) {
        const result = await request('playlists', { part: 'snippet,contentDetails', id: override.playlistId });
        if (!result.items?.[0]) throw new Error('A configured learning path playlist was not found.');
        selected.push(result.items[0]);
      }
    }

    const playlistEntries = new Map();
    for (const playlist of selected) {
      playlistEntries.set(playlist.id, await collectPages(request, 'playlistItems', { part: 'snippet,contentDetails', playlistId: playlist.id }));
    }
    const getId = item => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    const ids = [...new Set([...uploadedItems, ...[...playlistEntries.values()].flat()].map(getId).filter(Boolean))];
    const details = new Map();
    for (let offset = 0; offset < ids.length; offset += 50) {
      const result = await request('videos', { part: 'snippet,contentDetails,status', id: ids.slice(offset, offset + 50).join(',') });
      for (const video of result.items || []) if (usableVideo(video)) details.set(video.id, normalizeVideo(video));
    }
    const toVideos = entries => [...new Set(entries.map(getId))].map(id => details.get(id)).filter(Boolean);
    const videos = toVideos(uploadedItems).sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
    const usedSlugs = new Set();
    const learningPaths = selected.map(playlist => {
      const override = overrides.get(playlist.id) || {};
      const title = override.title || playlist.snippet.title;
      const baseSlug = slugify(override.slug || title);
      const slug = usedSlugs.has(baseSlug) ? `${baseSlug}-${playlist.id}` : baseSlug;
      usedSlugs.add(slug);
      const items = toVideos(playlistEntries.get(playlist.id));
      return {
        id: playlist.id,
        slug,
        title,
        description: override.description || (playlist.snippet.description || '').slice(0, 600),
        platform: override.platform || inferPlatform(title),
        thumbnail: items[0]?.thumbnail || '',
        audience: override.audience || '',
        prerequisites: override.prerequisites || '',
        videos: items,
      };
    }).filter(path => path.videos.length > 0);
    const feed = { fetchedAt: new Date().toISOString(), channelId: channel.id, videos, learningPaths };
    // No partial feed is published if any request fails.
    await writeFile(`${destination}.tmp`, `${JSON.stringify(feed, null, 2)}\n`);
    await rename(`${destination}.tmp`, destination);
    console.log(`YouTube sync complete: ${videos.length} videos and ${learningPaths.length} learning paths.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'YouTube sync failed.');
    process.exitCode = 1;
  }
}
