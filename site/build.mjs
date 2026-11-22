import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = name => new URL(name, import.meta.url);
const dist = name => new URL('../dist/' + name, import.meta.url);
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const origin = process.env.TRANSCRIPT_DECK_ORIGIN ?? 'https://transcriptdeck.com';
if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error('Set TRANSCRIPT_DECK_ORIGIN to one HTTPS origin.');
const measurementId = process.env.TRANSCRIPT_DECK_GA4_ID;
if (measurementId && !/^G-[A-Z0-9]+$/.test(measurementId)) throw new Error('Set TRANSCRIPT_DECK_GA4_ID to a GA4 measurement ID.');

const guide = '/guides/youtube-knowledge-base/';
const repo = 'https://github.com/andrewpeluso/transcript-deck';
const siteId = origin + '/#website';
const author = {
  '@type': 'Person',
  '@id': 'https://andrewpeluso.com/#andrew-peluso',
  name: 'Andrew Peluso',
  url: 'https://andrewpeluso.com/',
};
const pages = [
  {
    path: '/',
    template: 'index.html',
    schema: [
      { '@type': 'WebSite', '@id': siteId, url: origin + '/', name: 'Transcript Deck', creator: { '@id': author['@id'] }, inLanguage: 'en' },
      {
        '@type': 'SoftwareSourceCode',
        name: 'Transcript Deck',
        url: origin + '/',
        description: 'An open-source YouTube transcript skill for Codex and Claude Code.',
        codeRepository: repo,
        license: repo + '/blob/main/LICENSE',
        runtimePlatform: ['Codex', 'Claude Code'],
        author: { '@id': author['@id'] },
      },
    ],
  },
  {
    path: guide,
    template: 'guide.html',
    schema: [{
      '@type': 'TechArticle',
      headline: 'How to Build a YouTube Knowledge Base for Your AI Agent',
      url: origin + guide,
      mainEntityOfPage: origin + guide,
      author: { '@id': author['@id'] },
      isPartOf: { '@id': siteId },
      inLanguage: 'en',
    }],
  },
];

const starterPrompt = 'Use Transcript Deck (https://transcriptdeck.com/skill.md) to turn https://www.youtube.com/watch?v=uXdEVeoGRRc into a Markdown file with timestamped sections. Run the setup if needed and give me the file.';
const analytics = measurementId ? `<meta name="ga4-measurement-id" content="${measurementId}">` : '';
const headers = await readFile(site('_headers'), 'utf8');
const analyticsPolicy = [
  "script-src 'self' https://www.googletagmanager.com",
  "img-src 'self' https://*.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
].join('; ');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(({ path }) => `  <url><loc>${origin + path}</loc></url>`).join('\n')}\n</urlset>\n`;
const archive = 'youtube-knowledge-base-starter.zip';

async function buildPage({ path, template, schema }) {
  const html = await readFile(site(template), 'utf8');
  const metadata = `<link rel="canonical" href="${origin + path}">\n  <meta property="og:url" content="${origin + path}">`;
  const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': [...schema, author] }).replaceAll('<', '\\u003c');
  const directory = dist(path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), html
    .replaceAll('<!-- starter-prompt -->', () => escapeHtml(starterPrompt))
    .replace('<!-- canonical -->', metadata)
    .replace('<!-- structured-data -->', () => `<script type="application/ld+json">${graph}</script>`)
    .replace('<!-- analytics -->', analytics));
}

async function buildArchive() {
  const scratch = await mkdtemp(join(tmpdir(), 'transcript-deck-starter-'));
  try {
    await Promise.all([
      copyFile(site('starter/index.md'), join(scratch, 'index.md')),
      copyFile(site('sample.md'), join(scratch, 'sample.md')),
      copyFile(site('starter/prompts.md'), join(scratch, 'prompts.md')),
    ]);
    execFileSync('zip', ['-q', '-X', archive, 'index.md', 'sample.md', 'prompts.md'], { cwd: scratch });
    await copyFile(join(scratch, archive), fileURLToPath(dist(archive)));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await mkdir(dist(''), { recursive: true });
await Promise.all([
  ...pages.map(buildPage),
  buildArchive(),
  writeFile(dist('sitemap.xml'), sitemap),
  writeFile(dist('robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`),
  writeFile(dist('_headers'), measurementId ? headers.replace('frame-ancestors \'none\'', `frame-ancestors 'none'; ${analyticsPolicy}`) : headers),
  copyFile(new URL('../yt-structure/SKILL.md', import.meta.url), dist('skill.md')),
  ...['style.css', 'mark.svg', 'main.js', 'sample.md'].map(name => copyFile(site(name), dist(name))),
]);
