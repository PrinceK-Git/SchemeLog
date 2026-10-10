#!/usr/bin/env node
/**
 * sources:extract — raw bytes to page-numbered text and candidate facts (addendum §5).
 *
 * Reads only raw files already in `.cache/sources/`, so it never makes a request.
 * Writes normalised text and candidates to `sources/text/<sourceId>/`, and records
 * the resulting `textSha256` back onto the snapshot.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractHtml } from './lib/extract-html.mjs';
import { extractPdf } from './lib/extract-pdf.mjs';
import { findCandidates } from './lib/candidates.mjs';
import { normaliseText, sha256, stripRepeatedChrome } from './lib/normalise.mjs';
import {
  CACHE_DIR,
  SERVER_ROOT,
  TEXT_DIR,
  assertSafeId,
  ensureDir,
  isMain,
  listSnapshots,
  parseArgs,
  readRegistry,
} from './lib/paths.mjs';

/**
 * Turn one raw file into page-numbered lines.
 * @returns {Promise<{ lines: { text: string, locator: string }[], needsOcr: boolean }>}
 */
export async function extractBuffer(buffer, contentType) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  if (type === 'application/pdf' || buffer.subarray(0, 4).toString('latin1') === '%PDF') {
    const { pages, needsOcr } = await extractPdf(buffer);
    const cleaned = stripRepeatedChrome(pages);
    const lines = [];
    for (const page of cleaned) {
      for (const line of page.text.split('\n')) {
        const text = line.trim();
        if (text) lines.push({ text, locator: `p.${page.page}` });
      }
    }
    return { lines, needsOcr };
  }
  const { lines } = extractHtml(buffer.toString('utf8'));
  return { lines, needsOcr: false };
}

/** Text file header, so every stored excerpt is attributed to its source. */
function attributionHeader(snapshot, entry) {
  return [
    `# Source: ${entry?.kind ?? 'unknown'} — ${snapshot.sourceId}`,
    `# URL: ${snapshot.finalUrl ?? snapshot.url}`,
    `# Retrieved: ${snapshot.fetchedAt}`,
    `# Raw SHA-256: ${snapshot.rawSha256}`,
    '# Reproduced for verification. Facts are published only after human review.',
    '',
  ].join('\n');
}

/**
 * Extract every snapshot that has raw bytes but no stored text yet.
 * @returns {Promise<object[]>} summaries of what was written
 */
export async function runExtract(options = {}) {
  const {
    registry = readRegistry(),
    cacheDir = CACHE_DIR,
    textDir = TEXT_DIR,
    only = null,
    force = false,
    log = console.log,
  } = options;

  const results = [];
  for (const entry of registry.entries) {
    assertSafeId(entry.sourceId);
    if (only && entry.sourceId !== only) continue;

    for (const { path: snapshotPath } of listSnapshots(entry.sourceId)) {
      const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
      if (!snapshot.rawSha256) continue;
      if (snapshot.textSha256 && !force) continue;

      const rawPath = join(cacheDir, entry.sourceId, `${snapshot.rawSha256}.bin`);
      if (!existsSync(rawPath)) {
        log(`${entry.sourceId}: raw bytes not cached locally; skipped`);
        continue;
      }

      const buffer = readFileSync(rawPath);
      let extraction;
      try {
        extraction = await extractBuffer(buffer, snapshot.contentType);
      } catch (error) {
        snapshot.extractError = error.message;
        writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
        log(`${entry.sourceId}: extraction failed — ${error.message}`);
        continue;
      }

      if (extraction.needsOcr) {
        snapshot.outcome = 'needs-ocr';
        writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
        log(`${entry.sourceId}: needs-ocr, a person reads this PDF directly`);
        continue;
      }

      const body = normaliseText(
        extraction.lines.map((line) => `[${line.locator}] ${line.text}`).join('\n'),
      );
      const textSha256 = sha256(body);
      const dir = ensureDir(join(textDir, entry.sourceId));
      const textFile = join(dir, `${snapshot.rawSha256}.txt`);
      writeFileSync(textFile, `${attributionHeader(snapshot, entry)}${body}\n`);

      const candidates = findCandidates(extraction.lines, entry.sourceId);
      writeFileSync(
        join(dir, `${snapshot.rawSha256}.candidates.json`),
        `${JSON.stringify(candidates, null, 2)}\n`,
      );

      snapshot.textSha256 = textSha256;
      snapshot.textPath = `sources/text/${entry.sourceId}/${snapshot.rawSha256}.txt`;
      snapshot.candidatesPath = `sources/text/${entry.sourceId}/${snapshot.rawSha256}.candidates.json`;
      snapshot.lineCount = extraction.lines.length;
      writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

      results.push({
        sourceId: entry.sourceId,
        textSha256,
        lines: extraction.lines.length,
        candidates: candidates.candidates.length,
      });
      log(
        `${entry.sourceId}: ${extraction.lines.length} line(s), ${candidates.candidates.length} candidate(s)`,
      );
    }
  }
  return results;
}

if (isMain(import.meta.url)) {
  const args = parseArgs();
  const results = await runExtract({
    only: typeof args.source === 'string' ? args.source : null,
    force: Boolean(args.force),
  });
  console.log(`\n${results.length} snapshot(s) extracted. Root: ${SERVER_ROOT}`);
}
