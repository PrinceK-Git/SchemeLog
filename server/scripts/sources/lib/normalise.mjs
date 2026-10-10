import { createHash } from 'node:crypto';

/** SHA-256 of raw bytes: catches any byte change at all. */
export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Normalise extracted text before hashing (addendum §5):
 * Unicode NFC, Windows line endings unified, collapsed whitespace, trimmed lines,
 * and blank-line runs reduced. Only a change here triggers a review task, so a
 * re-encoded PDF or new page chrome does not create noise.
 *
 * @param {string} text
 * @returns {string}
 */
export function normaliseText(text) {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\u00a0\u2000-\u200b]+/g, ' ')
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strip headers and footers that repeat on most pages, so cosmetic page chrome
 * does not look like a wording change.
 *
 * @param {{ page: number, text: string }[]} pages
 * @param {number} [threshold] fraction of pages a line must appear on to be chrome
 * @returns {{ page: number, text: string }[]}
 */
export function stripRepeatedChrome(pages, threshold = 0.6) {
  if (pages.length < 3) return pages;
  const counts = new Map();
  for (const page of pages) {
    const lines = page.text.split('\n').map((l) => l.trim());
    const candidates = new Set([...lines.slice(0, 2), ...lines.slice(-2)].filter(Boolean));
    for (const line of candidates) counts.set(line, (counts.get(line) || 0) + 1);
  }
  const minimum = Math.ceil(pages.length * threshold);
  const chrome = new Set(
    [...counts.entries()]
      .filter(([line, count]) => count >= minimum && line.length < 120)
      .map(([line]) => line),
  );
  if (chrome.size === 0) return pages;
  return pages.map((page) => ({
    page: page.page,
    text: page.text
      .split('\n')
      .filter((line) => !chrome.has(line.trim()))
      .join('\n'),
  }));
}

/**
 * Index an Indian-grouped or western-grouped figure to a plain integer, so that
 * "2,50,000" and "250,000" compare equal. The original text is always kept as
 * written; only the index is normalised.
 *
 * @param {string} text
 * @returns {number | null}
 */
export function indexDigits(text) {
  const digits = text.replace(/[^\d.]/g, '');
  if (digits === '' || digits === '.') return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

/** A stable, line-oriented diff used by the review queue. No dependency needed. */
export function unifiedDiff(before, after, { context = 2 } = {}) {
  const a = before.split('\n');
  const b = after.split('\n');
  // Longest common subsequence over lines, small inputs only.
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) ops.push(['=', a[i++], j++]);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  while (i < a.length) ops.push(['-', a[i++]]);
  while (j < b.length) ops.push(['+', b[j++]]);

  // Keep only changed regions plus a little context.
  const keep = new Set();
  ops.forEach(([kind], index) => {
    if (kind === '=') return;
    for (let k = index - context; k <= index + context; k += 1)
      if (k >= 0 && k < ops.length) keep.add(k);
  });
  if (keep.size === 0) return '';
  const lines = [];
  let lastKept = -2;
  for (let index = 0; index < ops.length; index += 1) {
    if (!keep.has(index)) continue;
    if (index !== lastKept + 1) lines.push('@@');
    const [kind, line] = ops[index];
    lines.push(`${kind === '=' ? ' ' : kind}${line}`);
    lastKept = index;
  }
  return lines.join('\n');
}
