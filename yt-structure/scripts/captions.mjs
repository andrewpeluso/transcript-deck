const inlineTime = /<(\d{2,}:\d{2}(?::\d{2})?\.\d{3})>/g;
const cueTiming = /^((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})(?:\s|$)/;
const entities = { amp: '&', lt: '<', gt: '>', nbsp: ' ', quot: '"', apos: "'", lrm: '', rlm: '' };

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return Object.hasOwn(entities, key) ? entities[key] : entity;
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : entity;
  });
}

function seconds(time) {
  return time.replace(',', '.').split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
}

export function parseCaptions(source, rolling = false) {
  const blocks = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n[\t ]*\n/);
  const cues = [];
  let previous = null;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (/^(NOTE(?:\s|$)|STYLE$|REGION$)/.test(lines[0])) continue;
    const index = lines.findIndex(line => cueTiming.test(line));
    if (index === -1) continue;
    const match = lines[index].match(cueTiming);
    const start = seconds(match[1]);
    const end = seconds(match[2]);
    if (end < start) continue;

    const payload = lines.slice(index + 1).join('\n');
    const speaker = payload.match(/^<v(?:\.[^\s>]*)?\s+([^>]+)>/)?.[1];
    const text = decode(payload.replace(/<[^>]+>/g, '')).replace(/\s+/gu, ' ').trim();
    if (!text) continue;

    const words = text.split(' ');
    const timedRun = [...payload.matchAll(inlineTime)];
    const sameWindow = previous && start >= previous.start && start <= previous.end + 0.05;
    let overlap = 0;
    if (rolling && sameWindow && previous.speaker === speaker) {
      for (let size = Math.min(words.length, previous.words.length); size > 0; size -= 1) {
        if (words.slice(0, size).join(' ') !== previous.words.slice(-size).join(' ')) continue;
        // A word repeated in adjacent cues can be real speech. Require stronger
        // evidence before dropping it.
        const singleWordRollover = words.length === 1 &&
          (end - start < 0.05 || (previous.words.length === 1 && start < previous.end));
        if (size > 1 || singleWordRollover || timedRun.length) {
          overlap = size;
        }
        break;
      }
    }

    if (overlap < words.length) {
      let at = start;
      if (overlap > 0) {
        for (const tag of timedRun) {
          const before = decode(payload.slice(0, tag.index).replace(/<[^>]+>/g, '')).trim();
          if (before.split(/\s+/).filter(Boolean).length !== overlap) continue;
          at = Math.max(start, Math.min(end, seconds(tag[1])));
          break;
        }
      }
      cues.push({ at, text: words.slice(overlap).join(' '), ...(speaker ? { speaker: decode(speaker) } : {}) });
    }
    previous = { start, end, words, speaker };
  }
  return cues;
}

export function timecode(at) {
  const whole = Math.floor(at);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor(whole / 60) % 60;
  const tail = String(whole % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}` : `${minutes}:${tail}`;
}
