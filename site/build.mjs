import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const site = name => new URL(name, import.meta.url);
const dist = name => new URL('../dist/' + name, import.meta.url);
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const raw = (await readFile(site('raw.txt'), 'utf8')).trim();
const homepage = await readFile(site('index.html'), 'utf8');
const origin = process.env.TRANSCRIPT_DECK_ORIGIN;
if (origin && !/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error('Set TRANSCRIPT_DECK_ORIGIN to one HTTPS origin.');
const metadata = origin ? `<link rel="canonical" href="${origin}/">\n  <meta property="og:url" content="${origin}/">` : '';
await mkdir(fileURLToPath(dist('')), { recursive: true });
await Promise.all([
  writeFile(dist('index.html'), homepage.replace('<!-- raw-caption-preview -->', () => escapeHtml(raw)).replace('<!-- canonical -->', metadata)),
  copyFile(new URL('../yt-structure/SKILL.md', import.meta.url), dist('skill.md')),
  ...['style.css', 'mark.svg', 'main.js', 'sample.md', '_headers'].map(name => copyFile(site(name), dist(name))),
]);
