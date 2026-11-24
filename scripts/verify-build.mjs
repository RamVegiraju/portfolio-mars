/** Validate the generated static site's local links, page semantics, and draft exclusion. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('dist');
const { interests } = JSON.parse(await readFile('src/data/interests.json', 'utf8'));
const slugs = new Set(['home', 'professional', 'writing', 'videos', 'about', 'admin', 'api', '404']);
for (const interest of interests) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(interest.slug) && !slugs.has(interest.slug), `Interest URL must be unique and cannot use a reserved route: ${interest.slug}`);
  for (const field of ['title', 'heading', 'topic', 'description', 'intro']) assert(typeof interest[field] === 'string' && interest[field].trim(), `Interest ${interest.slug}: missing ${field}`);
  slugs.add(interest.slug);
}
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const files = await walk(output);
const htmlFiles = files.filter(file => file.endsWith('.html') && !file.includes('/admin/'));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const redirect = /<meta[^>]+http-equiv="refresh"/i.test(html);
  if (redirect) assert(file === join(output, 'about', 'index.html') && /url=\//i.test(html), `${file}: unexpected redirect`);
  else {
    assert.equal((html.match(/<main(?:\s|>)/g) || []).length, 1, `${file}: exactly one main landmark`);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${file}: exactly one page heading`);
  }
  assert(!/AIza[0-9A-Za-z_-]{30,}|art_v2_[0-9A-Za-z_-]+/.test(html), `${file}: credential pattern in public output`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
    if (match[1].startsWith('//')) continue;
    const path = decodeURIComponent(match[1].split(/[?#]/)[0]);
    let target = join(output, path);
    assert(target.startsWith(output), `${file}: path escapes output`);
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
    } catch { throw new Error(`${file}: missing local link ${path}`); }
  }
}
const postFiles = (await walk(resolve('src/content/posts'))).filter(file => file.endsWith('.md'));
for (const file of postFiles) {
  const source = await readFile(file, 'utf8');
  if (!/^draft:\s*true\s*$/m.test(source)) continue;
  const title = source.match(/^title:\s*(.+)$/m)?.[1];
  if (!title) continue;
  for (const built of [...htmlFiles, join(output,'rss.xml')]) {
    assert(!(await readFile(built, 'utf8')).includes(title), `Draft title leaked into ${built}`);
  }
}
console.log(`Verified ${htmlFiles.length} HTML pages: local links, main landmarks, headings, credential exclusion, and draft exclusion.`);
