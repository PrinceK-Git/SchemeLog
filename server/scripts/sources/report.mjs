#!/usr/bin/env node
/**
 * sources:report — diffs and the review queue (addendum §6).
 *
 * Writes `sources/diffs/<sourceId>/<date>.diff` and `sources/report.md`.
 * It never edits `src/data/schemes/`: only a curator and reviewer change a record.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { diffCandidates } from './lib/candidates.mjs';
import { unifiedDiff } from './lib/normalise.mjs';
import {
  DIFF_DIR,
  SCHEMES_DIR,
  SOURCES_DIR,
  assertSafeId,
  ensureDir,
  isMain,
  listSnapshots,
  parseArgs,
  readRegistry,
} from './lib/paths.mjs';
import { readdirSync } from 'node:fs';

const stripHeader = (text) =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('# '))
    .join('\n');

/** Load every scheme record so the report can name the facts a change affects. */
function loadSchemes(dir = SCHEMES_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')));
}

/**
 * Compare the two most recent text snapshots of each source and build the queue.
 * @returns {{ markdown: string, items: object[], diffs: { sourceId: string, path: string }[] }}
 */
export function buildReport(options = {}) {
  const {
    registry = readRegistry(),
    schemes = loadSchemes(),
    sourcesDir = SOURCES_DIR,
    diffDir = DIFF_DIR,
    today = new Date().toISOString().slice(0, 10),
    writeDiffs = true,
  } = options;

  const items = [];
  const diffs = [];

  for (const entry of registry.entries) {
    assertSafeId(entry.sourceId);
    const snapshots = listSnapshots(entry.sourceId).map(({ path }) =>
      JSON.parse(readFileSync(path, 'utf8')),
    );
    if (snapshots.length === 0) {
      items.push({
        schemeId: entry.schemeId,
        sourceId: entry.sourceId,
        kind: entry.kind,
        state: 'NEVER FETCHED',
        task: 'Run npm run sources:fetch, or check this source by hand.',
        factGroups: entry.factGroups,
      });
      continue;
    }

    const latest = snapshots.at(-1);
    const base = {
      schemeId: entry.schemeId,
      sourceId: entry.sourceId,
      kind: entry.kind,
      factGroups: entry.factGroups,
      fetchedAt: latest.fetchedAt.slice(0, 10),
    };

    if (latest.outcome === 'http-error' && [404, 410].includes(latest.status)) {
      // Addendum §6: a 404/410 marks dependent links broken; facts keep their state.
      items.push({
        ...base,
        state: `${latest.status} SINCE ${base.fetchedAt}`,
        task: 'Source unavailable — recheck the official destination and mark the link broken.',
      });
      continue;
    }
    if (latest.outcome === 'robots-blocked') {
      items.push({
        ...base,
        state: 'MANUAL CHECK ONLY',
        task: latest.detail ?? 'Automated checks are off for this host.',
      });
      continue;
    }
    if (['redirect-blocked', 'type-mismatch'].includes(latest.outcome)) {
      items.push({
        ...base,
        state: latest.outcome.toUpperCase(),
        task: 'Source moved or replaced — confirm the current official URL.',
      });
      continue;
    }
    if (latest.outcome === 'needs-ocr') {
      items.push({
        ...base,
        state: 'NEEDS OCR',
        task: 'No text layer; a person reads this PDF and cites page numbers by hand.',
      });
      continue;
    }

    const texts = snapshots.filter((snapshot) => snapshot.textSha256 && snapshot.textPath);
    if (texts.length < 2) continue;
    const [previous, current] = texts.slice(-2);
    if (previous.textSha256 === current.textSha256) continue; // re-encoded bytes only

    const previousText = stripHeader(
      readFileSync(join(sourcesDir, '..', previous.textPath), 'utf8'),
    );
    const currentText = stripHeader(readFileSync(join(sourcesDir, '..', current.textPath), 'utf8'));
    const diff = unifiedDiff(previousText, currentText);
    let diffPath = null;
    if (writeDiffs && diff) {
      const dir = ensureDir(join(diffDir, entry.sourceId));
      diffPath = join(dir, `${today}.diff`);
      writeFileSync(diffPath, `${diff}\n`);
      diffs.push({ sourceId: entry.sourceId, path: diffPath });
    }

    const candidateChange = diffCandidates(
      JSON.parse(readFileSync(join(sourcesDir, '..', previous.candidatesPath), 'utf8')),
      JSON.parse(readFileSync(join(sourcesDir, '..', current.candidatesPath), 'utf8')),
    );

    items.push({
      ...base,
      state: 'CHANGED',
      task: 'Source changed — re-check every fact in the affected groups against the new text, then update textSha256 and retrievedAt.',
      diffPath: diffPath ? `sources/diffs/${entry.sourceId}/${today}.diff` : null,
      diffLines: diff ? diff.split('\n').length : 0,
      candidateChange,
      reviewDue: schemes
        .filter((scheme) => scheme.id === entry.schemeId)
        .flatMap(() => entry.factGroups),
    });
  }

  return { markdown: renderMarkdown(items, today), items, diffs };
}

/** Render the review queue, grouped by scheme. */
export function renderMarkdown(items, today) {
  const lines = [
    '# Source review queue',
    '',
    `Generated ${today} by \`npm run sources:report\`.`,
    '',
    'Automated checks never change a published fact. Every item below needs a curator to',
    're-check the source text and a second teammate to approve before the catalogue changes.',
    '',
  ];

  if (items.length === 0) {
    lines.push('No review tasks: every registered source matched its last snapshot.', '');
    return lines.join('\n');
  }

  const bySchemeId = new Map();
  for (const item of items) {
    if (!bySchemeId.has(item.schemeId)) bySchemeId.set(item.schemeId, []);
    bySchemeId.get(item.schemeId).push(item);
  }

  for (const schemeId of [...bySchemeId.keys()].sort()) {
    lines.push(`## ${schemeId}`);
    for (const item of bySchemeId.get(schemeId)) {
      lines.push(
        `- ${item.sourceId} ${item.kind} — ${item.state}${item.fetchedAt ? ` (${item.fetchedAt})` : ''}`,
      );
      lines.push(`  - affects: ${item.factGroups.join(', ')}`);
      lines.push(`  - task: ${item.task}`);
      if (item.diffPath) lines.push(`  - diff: ${item.diffPath} (${item.diffLines} lines)`);
      for (const added of item.candidateChange?.added?.slice(0, 5) ?? [])
        lines.push(`  - candidate now present: ${added.type} "${added.text}" (${added.locator})`);
      for (const removed of item.candidateChange?.removed?.slice(0, 5) ?? [])
        lines.push(
          `  - candidate no longer present: ${removed.type} "${removed.text}" (${removed.locator})`,
        );
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const args = parseArgs();
  const { markdown, items } = buildReport();
  const target = join(SOURCES_DIR, 'report.md');
  ensureDir(SOURCES_DIR);
  writeFileSync(target, markdown);
  console.log(markdown);
  console.log(`\nWrote ${target}`);
  // CI uses a non-zero exit only when asked, so a normal run never fails a build.
  if (args['fail-on-review'] && items.length > 0) process.exit(1);
}
