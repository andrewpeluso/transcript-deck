import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseCaptions, timecode } from '../yt-structure/scripts/captions.mjs';

const cli = fileURLToPath(new URL('../yt-structure/scripts/transcript.mjs', import.meta.url));
const launcher = fileURLToPath(new URL('../yt-structure/scripts/yt-transcript', import.meta.url));
const video = 'https://youtu.be/eRsGyueVLvQ';
const rawSample = readFileSync(new URL('../site/raw.txt', import.meta.url), 'utf8');
const sample = readFileSync(new URL('../site/sample.md', import.meta.url), 'utf8');

test('ordinary WebVTT and SRT keep every cue, multiline text and known speaker names', () => {
  assert.deepEqual(parseCaptions(`WEBVTT

1
00:01:47.250 --> 00:01:50.500 align:start
<v Gatekeeper>Dark &amp; cold
over the hill.</v>

NOTE ignored

2
00:01:51,800 --> 00:01:55,800
It's dark &lt;here&gt;.
`), [
    { at: 107.25, text: 'Dark & cold over the hill.', speaker: 'Gatekeeper' },
    { at: 111.8, text: "It's dark <here>." },
  ]);
  assert.equal(timecode(3691), '1:01:31');
});

test('automatic caption windows add only new words and keep ordinary manual repeats', () => {
  const vtt = `WEBVTT

00:00:00.000 --> 00:00:03.000
We went home

00:00:02.000 --> 00:00:05.000
went home<00:00:03.500><c> last night</c>

00:00:04.000 --> 00:00:06.000
last night

00:00:08.000 --> 00:00:09.000
last night
`;
  assert.deepEqual(parseCaptions(vtt, true), [
    { at: 0, text: 'We went home' },
    { at: 3.5, text: 'last night' },
    { at: 8, text: 'last night' },
  ]);
  assert.equal(parseCaptions(vtt).length, 4);
});

test('the example preserves its spoken words and links to real cue timestamps', () => {
  const cues = parseCaptions(rawSample, true);
  const dialogue = sample.slice(sample.indexOf('## Share your work'), sample.indexOf('## Recap'))
    .split('\n').filter(line => line && !line.startsWith('##') && !line.startsWith('[')).join(' ');
  const words = text => text.toLowerCase().replaceAll('’', "'").match(/[a-z]+(?:'[a-z]+)?/g);
  assert.deepEqual(words(dialogue), words(cues.map(cue => cue.text).join(' ')));

  const at = cues.map(cue => Math.floor(cue.at));
  const links = [...sample.matchAll(/watch\?v=q0VzUigrb_g&t=(\d+)s\)/g)].map(match => Number(match[1]));
  assert.deepEqual(links, [73, 93, 113]);
  assert.ok(links.every(link => at.includes(link)));
});

test('portable setup rejects a download with the wrong checksum', context => {
  const temp = mkdtempSync(join(tmpdir(), 'transcript-deck-checksum-'));
  context.after(() => rmSync(temp, { recursive: true, force: true }));
  const cache = join(temp, 'cache');
  writeFileSync(join(temp, 'yt-dlp'), '#!/bin/bash\nprintf "2000.01.01\\n"\n', { mode: 0o755 });
  writeFileSync(join(temp, 'curl'), `#!/bin/bash
while [[ $# -gt 0 ]]; do
  if [[ "$1" == '-o' ]]; then
    printf 'unexpected download' > "$2"
    exit 0
  fi
  shift
done
exit 1
`, { mode: 0o755 });
  const result = spawnSync('/bin/bash', [launcher, video], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: [temp, dirname(process.execPath), process.env.PATH].join(delimiter),
      TRANSCRIPT_DECK_CACHE_DIR: cache,
    },
  });
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stderr, /failed its checksum/);
  assert.deepEqual(readdirSync(cache), []);
});

function setupCli(context) {
  const temp = mkdtempSync(join(tmpdir(), 'transcript-deck-test-'));
  context.after(() => rmSync(temp, { recursive: true, force: true }));
  const output = join(temp, 'output');
  const mock = join(temp, 'yt-dlp');
  const log = join(temp, 'tracks.log');
  writeFileSync(mock, `#!${process.execPath}
const {appendFileSync, writeFileSync} = require('node:fs');
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const scenario = process.env.TEST_CAPTIONS;
if (args.includes('--dump-single-json')) {
  console.log(JSON.stringify({
    title: 'Caption example',
    subtitles: scenario === 'none' ? {} : {en: [{ext: 'vtt'}]},
    automatic_captions: scenario === 'none' ? {} : {'en-orig': [{ext: 'vtt'}], en: [{ext: 'vtt'}]},
  }));
} else {
  const track = value('--sub-langs');
  appendFileSync(process.env.TEST_LOG, track + '\\n');
  if (scenario === 'limited' || scenario === 'fallback' && track === '^en$') {
    console.error('HTTP Error 429: Too Many Requests');
    process.exitCode = 1;
  } else {
    const path = value('-o').replace('.%(ext)s', '.en.vtt');
    writeFileSync(path, 'WEBVTT\\n\\n00:00:10.000 --> 00:00:12.000\\nA complete caption.\\n');
  }
}
`, { mode: 0o755 });
  return {
    temp, output, log,
    run(scenario, args = [video, output], path = temp + delimiter + dirname(process.execPath)) {
      return spawnSync(process.execPath, [cli, ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: path, TEST_CAPTIONS: scenario, TEST_LOG: log },
      });
    },
  };
}

test('CLI chooses manual captions, saves evidence, and normalizes the source URL', context => {
  const fixture = setupCli(context);
  const result = fixture.run('manual');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(fixture.log, 'utf8'), '^en$\n');
  const text = readFileSync(result.stdout.trim(), 'utf8');
  assert.match(text, /Source: https:\/\/www\.youtube\.com\/watch\?v=eRsGyueVLvQ/);
  assert.match(text, /\[0:10\] A complete caption\./);
});

test('CLI retries the original English track once and reports repeated rate limiting', context => {
  const fixture = setupCli(context);
  const recovered = fixture.run('fallback');
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.match(readFileSync(recovered.stdout.trim(), 'utf8'), /\(en-orig\)/);
  assert.equal(readFileSync(fixture.log, 'utf8'), '^en$\n^en-orig$\n');
  const failure = fixture.run('limited');
  assert.equal(failure.status, 4);
  assert.match(failure.stderr, /rate-limited.*VTT, SRT/);
  assert.equal(readFileSync(fixture.log, 'utf8'), '^en$\n^en-orig$\n^en$\n^en-orig$\n');
  assert.equal(readdirSync(fixture.output).length, 1);
});

test('CLI offers supplied captions when a track or dependency is unavailable', context => {
  const fixture = setupCli(context);
  const absent = fixture.run('none');
  assert.equal(absent.status, 2);
  assert.match(absent.stderr, /No English caption track/);
  const missing = fixture.run('none', [video, fixture.output], fixture.output);
  assert.equal(missing.status, 3);
  assert.match(missing.stderr, /bundled yt-transcript script/);
  const picked = join(fixture.temp, 'supplied.srt');
  writeFileSync(picked, '1\n00:00:03,500 --> 00:00:04,400\nSupplied words.\n');
  const supplied = fixture.run('none', ['--captions', picked, fixture.output], fixture.output);
  assert.equal(supplied.status, 0, supplied.stderr);
  assert.match(readFileSync(supplied.stdout.trim(), 'utf8'), /\[0:03\] Supplied words\./);
  const invalid = fixture.run('none', ['https://other.example/?v=eRsGyueVLvQ', fixture.output]);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Paste a YouTube URL/);
});
