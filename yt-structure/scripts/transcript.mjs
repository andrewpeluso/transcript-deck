import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parseCaptions, timecode } from './captions.mjs';

const usage = 'Usage: yt-transcript <youtube-url> [output-dir]\n       yt-transcript --captions <file.vtt|file.srt|file.txt> [output-dir]';
const setup = 'Run the bundled yt-transcript script so it can prepare the caption tool. You can also supply captions as VTT, SRT, or text.';
const downloaderFlags = ['--ignore-config', '--no-playlist', '--skip-download', '--no-warnings', '--no-progress', '--retries', '0', '--extractor-retries', '0', '--socket-timeout', '12', '--js-runtimes', 'node:' + process.execPath];
const missingText = 'Supply a VTT, SRT, or text transcript to continue.';

class TranscriptError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function canonicalVideo(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TranscriptError('Paste a full YouTube video URL.');
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/');
  let id;
  if (host === 'youtu.be') id = parts[1];
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    if (['shorts', 'live', 'embed'].includes(parts[1])) id = parts[2];
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !/^[\w-]{11}$/.test(id ?? '')) {
    throw new TranscriptError('Paste a YouTube URL for one video, Short, or live recording.');
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

function runDownloader(args, url) {
  const result = spawnSync(process.env.TRANSCRIPT_DECK_YTDLP || 'yt-dlp', [...downloaderFlags, ...args, '--', url], {
    encoding: 'utf8', timeout: 45_000, maxBuffer: 24 * 1024 * 1024,
  });
  if (result.error?.code === 'ENOENT') throw new TranscriptError(`yt-dlp was not found. ${setup}`, 3);
  return result;
}

function failureMessage(result) {
  const detail = result.stderr ?? '';
  if (/\b429\b|too many requests|rate.limit/i.test(detail)) return 'YouTube rate-limited the caption request.';
  if (/private video|login required|sign in|members.only/i.test(detail)) return 'YouTube required sign-in for this request.';
  if (result.error?.code === 'ETIMEDOUT' || /timed out/i.test(detail)) return 'YouTube did not respond in time.';
  return 'YouTube captions could not be retrieved.';
}

function selectTracks(metadata) {
  const manual = Object.entries(metadata.subtitles ?? {}).filter(([key, formats]) => {
    return /^en(?:-[A-Za-z]{2,8})?$/.test(key) && formats.some(format => format.ext === 'vtt');
  }).sort(([left], [right]) => Number(right === 'en') - Number(left === 'en'));
  const automatic = ['en-orig', 'en'].filter(key => metadata.automatic_captions?.[key]?.some(format => format.ext === 'vtt'));
  return [
    ...manual.slice(0, 1).map(([key]) => ({ key, auto: false })),
    ...automatic.map(key => ({ key, auto: true })),
  ];
}

function retrieve(url) {
  const result = runDownloader(['--dump-single-json', '--no-write-subs', '--no-write-auto-subs'], url);
  if (result.status !== 0) throw new TranscriptError(`${failureMessage(result)} ${missingText}`, 4);
  let metadata;
  try {
    metadata = JSON.parse(result.stdout);
  } catch {
    throw new TranscriptError(`yt-dlp did not return video details. ${setup}`, 4);
  }

  const tracks = selectTracks(metadata);
  if (!tracks.length) throw new TranscriptError(`No English caption track is available for this video. ${missingText}`, 2);

  const temp = mkdtempSync(join(tmpdir(), 'transcript-deck-'));
  let lastFailure;
  try {
    for (const { key, auto } of tracks) {
      if (lastFailure?.includes('rate-limited') && key !== 'en-orig') break;
      const prefix = `${auto ? 'auto' : 'manual'}-${key}`;
      const args = [
        auto ? '--write-auto-subs' : '--write-subs', auto ? '--no-write-subs' : '--no-write-auto-subs',
        '--sub-langs', `^${key}$`, '--sub-format', 'vtt',
        '--no-simulate', '-o', join(temp, prefix + '.%(ext)s'),
      ];
      const attempt = runDownloader(args, url);
      if (attempt.status !== 0) {
        lastFailure = failureMessage(attempt);
        continue;
      }
      const name = readdirSync(temp).find(file => file.startsWith(prefix + '.') && file.endsWith('.vtt'));
      if (!name) continue;
      const cues = parseCaptions(readFileSync(join(temp, name), 'utf8'), auto);
      if (cues.length) return {
        title: metadata.title ?? metadata.id ?? 'YouTube transcript',
        source: url,
        track: `${auto ? 'YouTube automatic or translated' : 'YouTube manual'} (${key})`,
        body: cueText(cues),
      };
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }

  const message = lastFailure ?? 'English caption tracks were found but contained no usable cues.';
  throw new TranscriptError(`${message} ${missingText}`, 4);
}

function cueText(cues) {
  return cues.map(cue => `[${timecode(cue.at)}] ${cue.speaker ? cue.speaker + ': ' : ''}${cue.text}`).join('\n');
}

function suppliedCaptions(input) {
  const extension = extname(input).toLowerCase();
  if (!['.txt', '.vtt', '.srt'].includes(extension)) throw new TranscriptError('Use a .vtt, .srt, or .txt file.');
  const source = readFileSync(input, 'utf8');
  const body = extension === '.txt' ? source.trim() : cueText(parseCaptions(source, extension === '.vtt' && /<\d{2,}:\d{2}:\d{2}\.\d{3}>/.test(source)));
  if (!body) throw new TranscriptError('The supplied caption file is empty or has no readable cues.', 2);
  return { title: basename(input, extname(input)), track: 'Supplied transcript', body };
}

function saveTranscript(transcript, outputDir) {
  const slug = transcript.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-$/, '') || 'transcript';
  const target = resolve(outputDir ?? '.', `${slug}.transcript.txt`);
  mkdirSync(dirname(target), { recursive: true });
  const temp = mkdtempSync(join(dirname(target), '.transcript-deck-'));
  try {
    const path = join(temp, 'transcript.txt');
    const headers = [`# ${transcript.title.replace(/[\r\n]+/g, ' ')}`, transcript.source && `Source: ${transcript.source}`, `Captions: ${transcript.track}`];
    writeFileSync(path, headers.filter(Boolean).join('\n') + '\n\n' + transcript.body + '\n');
    renameSync(path, target);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  console.log(target);
}

const args = process.argv.slice(2);
try {
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    console.log(usage);
  } else if (args[0] === '--captions' && args.length >= 2 && args.length <= 3) {
    saveTranscript(suppliedCaptions(args[1]), args[2]);
  } else if (args.length <= 2 && !args[0].startsWith('-')) {
    saveTranscript(retrieve(canonicalVideo(args[0])), args[1]);
  } else {
    throw new TranscriptError(usage);
  }
} catch (error) {
  console.error(error instanceof TranscriptError ? error.message : `Transcript Deck could not finish: ${error.message}`);
  process.exitCode = error.code && typeof error.code === 'number' ? error.code : 1;
}
