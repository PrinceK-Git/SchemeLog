#!/usr/bin/env node
/**
 * npm run validate:catalogue — validates every file in src/data/schemes/.
 * Exits non-zero on any reject. Quarantines and warnings are printed but do not
 * fail the build; quarantined records are dropped by build:catalogue and
 * disclosed in the coverage statement.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalogue } from '../src/domain/validation/validateCatalogue.js';
import { latestTextSnapshot } from './sources/lib/paths.mjs';
import { parseArgs, isMain } from './sources/lib/paths.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMES_DIR = resolve(here, '..', 'src', 'data', 'schemes');

/** Read every scheme record, newest-sorted by id so the report is stable. */
export function loadSchemeRecords(dir = SCHEMES_DIR) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const path = join(dir, file);
      try {
        return { file, record: JSON.parse(readFileSync(path, 'utf8')) };
      } catch (error) {
        throw new Error(`${file} is not valid JSON: ${error.message}`);
      }
    });
}

/**
 * Collect the latest extracted text hash per source, so the validator can flag
 * a record whose cited source has changed since it was curated (addendum §6).
 */
export function collectSnapshotHashes(records) {
  const hashes = {};
  for (const record of records) {
    for (const source of record.sources ?? []) {
      const snapshot = latestTextSnapshot(source.id);
      if (snapshot?.textSha256) hashes[source.id] = snapshot.textSha256;
    }
  }
  return hashes;
}

function printFindings(title, findings) {
  if (findings.length === 0) return;
  console.log(`\n${title} (${findings.length})`);
  for (const f of findings)
    console.log(`  [${f.layer}/${f.check}] ${f.schemeId ?? '-'} ${f.path}: ${f.message}`);
}

export function runValidation(options = {}) {
  const loaded = options.loaded ?? loadSchemeRecords(options.dir);
  const records = loaded.map((entry) => entry.record);
  return validateCatalogue(records, {
    evaluatedAt: options.evaluatedAt,
    strictReview: options.strictReview ?? false,
    snapshotHashes: options.snapshotHashes ?? collectSnapshotHashes(records),
  });
}

if (isMain(import.meta.url)) {
  const args = parseArgs();
  const loaded = loadSchemeRecords();
  const report = runValidation({ loaded, strictReview: Boolean(args.strict) });

  console.log(`Validated ${loaded.length} scheme record(s) in src/data/schemes/.`);
  printFindings('REJECTS (build fails)', report.rejects);
  printFindings('QUARANTINED (record dropped from the shipped catalogue)', report.quarantines);
  printFindings('WARNINGS', report.warnings);

  const published = loaded.filter((e) => e.record.publicationStatus === 'published').length;
  console.log(
    `\n${published} published, ${report.publishable.length} publishable after quarantine, ` +
      `${report.rejects.length} reject(s), ${report.quarantines.length} quarantine(s), ${report.warnings.length} warning(s).`,
  );
  if (!report.ok) {
    console.error('\nValidation failed: fix every reject before publishing.');
    process.exit(1);
  }
  console.log('Validation passed with zero rejects.');
}
