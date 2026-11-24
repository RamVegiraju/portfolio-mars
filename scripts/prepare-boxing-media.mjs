#!/usr/bin/env node
/** Convert supplied sparring/mitts videos to SDR H.264 MP4s and posters. Originals are never modified. */
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, copyFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [sparring, mitts, sparring2025] = process.argv.slice(2);
if (!sparring || !mitts) {
  console.error('Usage: node scripts/prepare-boxing-media.mjs /path/sparring-2026.mov /path/mitts-2026.mov [/path/sparring-2025.mov]\nRequires FFmpeg with zscale, tonemap, and libx264. Set FFMPEG_PATH if it is not on PATH.');
  process.exit(1);
}
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const destination = resolve('public/media/boxing');
const staging = await mkdtemp(join(tmpdir(), 'boxing-media-'));
await mkdir(destination, { recursive: true });

function run(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolveRun() : reject(new Error(error || `FFmpeg exited ${code}`)));
  });
}

const clips = [['sparring-2026', sparring], ['mitts-2026', mitts], ...(sparring2025 ? [['sparring-2025', sparring2025]] : [])];
for (const [name, source] of clips) {
  await access(source);
  const output = join(staging, `${name}.mp4`);
  // The supplied originals are HLG iPhone footage. Bake rotation, map HDR to SDR, and omit private metadata/data tracks.
  await run(['-i', resolve(source), '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-map_metadata', '-1', '-map_chapters', '-1',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', output]);
  const size = (await stat(output)).size;
  if (size > 20 * 1024 * 1024) throw new Error(`${name} exceeds 20 MiB; adjust encoding before publishing.`);
  await run(['-ss', '3', '-i', output, '-frames:v', '1', '-vf', 'scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2', '-q:v', '3', '-map_metadata', '-1', '-update', '1', join(staging, `${name}-poster.jpg`)]);
  console.log(`Prepared ${name}: ${(size / 1024 / 1024).toFixed(1)} MiB`);
}
// Publish the prepared set only after all conversions succeed.
for (const [name] of clips) {
  for (const extension of ['.mp4', '-poster.jpg']) await copyFile(join(staging, `${name}${extension}`), join(destination, `${name}${extension}`));
}
console.log('Prepared boxing videos and posters in public/media/boxing/.');
