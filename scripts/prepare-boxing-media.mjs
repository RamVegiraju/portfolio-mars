#!/usr/bin/env node
/** Convert supplied sparring/mitts videos to SDR H.264 MP4s and posters. Originals are never modified. */
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, copyFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const single = args[0] === '--single';
const [sparring, mitts, sparring2025] = args;
if ((!single && (!sparring || !mitts)) || (single && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args[1] || '') || !args[2] || !['--sdr', '--hlg'].includes(args[3])))) {
  console.error('Usage: node scripts/prepare-boxing-media.mjs /path/sparring-2026.mov /path/mitts-2026.mov [/path/sparring-2025.mov]\nOr: node scripts/prepare-boxing-media.mjs --single asset-name /path/clip.mp4 --sdr|--hlg\nRequires FFmpeg with zscale, tonemap, and libx264. Set FFMPEG_PATH if it is not on PATH.');
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

const clips = single ? [[args[1], args[2], args[3] === '--hlg']] : [['sparring-2026', sparring, true], ['mitts-2026', mitts, true], ...(sparring2025 ? [['sparring-2025', sparring2025, true]] : [])];
for (const [name, source, hdr] of clips) {
  await access(source);
  const output = join(staging, `${name}.mp4`);
  // Tone-map only HLG inputs. Bake rotation and omit private metadata/data tracks in both modes.
  const colorFilter = hdr ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,' : '';
  const dimension = single ? 960 : 1280;
  await run(['-i', resolve(source), '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', `${colorFilter}format=yuv420p,scale=${dimension}:${dimension}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', single ? '25' : '24', '-profile:v', 'high',
    ...(single ? ['-maxrate', '1000k', '-bufsize', '2000k'] : []),
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
