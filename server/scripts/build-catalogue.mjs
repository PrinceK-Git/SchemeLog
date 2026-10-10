#!/usr/bin/env node
// Offline-only publication. Never import or call the network fetcher here.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validateCatalogue,
  validateCatalogueEnvelope,
} from '../src/domain/validation/validateCatalogue.js';
import { loadSchemeRecords, collectSnapshotHashes } from './validate-catalogue.mjs';
import { checkRegistry } from './validate-registry.mjs';
import { isMain, readRegistry } from './sources/lib/paths.mjs';

const serverOutput = new URL('../src/data/catalogue.json', import.meta.url);
const clientOutput = new URL('../../client/src/data/catalogue.json', import.meta.url);
const releasePath = new URL('../src/data/release.json', import.meta.url);

export function collectIncomeThresholds(records) {
  const edges = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.field === 'annualHouseholdIncome')
      for (const key of ['value', 'min', 'max'])
        if (Number.isFinite(node[key])) edges.add(node[key]);
    for (const child of node.children ?? []) walk(child);
    walk(node.child);
  };
  for (const record of records) walk(record.eligibility.rule);
  return [...edges].sort((a, b) => a - b);
}

export function buildCatalogue(
  records,
  { registry, release, snapshotHashes = {}, evaluatedAt } = {},
) {
  const registryReport = checkRegistry(registry, records, evaluatedAt);
  if (!registryReport.ok) throw new Error(registryReport.errors.join('\n'));
  const report = validateCatalogue(records, { evaluatedAt, snapshotHashes, strictReview: true });
  if (!report.ok)
    throw new Error(report.rejects.map((f) => `${f.schemeId}: ${f.message}`).join('\n'));
  // Conservative interim policy: changed sources withhold the whole record until
  // re-review. Fine-grained engine review-due integration is explicitly deferred.
  const withheld = new Map();
  const schemes = report.publishable
    .filter((record) => {
      for (const source of record.sources) {
        if (snapshotHashes[source.id] && snapshotHashes[source.id] !== source.textSha256) {
          withheld.set(record.id, 'Source hash changed or has not been acknowledged by a curator.');
          return false;
        }
      }
      return true;
    })
    .map((r) => structuredClone(r))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const f of report.quarantines) {
    if (records.some((r) => r.id === f.schemeId && r.publicationStatus === 'published'))
      withheld.set(f.schemeId, f.message);
  }
  const jurisdictions = new Set();
  const levels = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.field === 'educationLevel' && ['eq', 'in'].includes(node.operator))
      for (const code of [].concat(node.value)) levels.add(code);
    for (const child of node.children ?? []) walk(child);
    // Exclusions do not imply coverage of the excluded education level.
  };
  for (const record of schemes) {
    jurisdictions.add(record.jurisdiction);
    if (Array.isArray(record.applicableStates))
      record.applicableStates.forEach((s) => jurisdictions.add(s));
    walk(record.eligibility.rule);
  }
  const count = schemes.length;
  const catalogue = {
    schemaVersion: '1.0.0',
    catalogueVersion: release.catalogueVersion,
    publishedAt: release.publishedAt,
    vocabVersion: '1.0.0',
    coverage: {
      domains: ['student-scholarship'],
      jurisdictions: [...jurisdictions].sort(),
      educationLevels: [...levels].sort(),
      schemeCount: count,
      statement:
        count === 0
          ? 'No real scholarships have cleared independent human review. The frontend remains a labelled fictional demonstration, not a verified catalogue.'
          : `Covers ${count} selected scholarships. This is not a complete list of scholarships in India. ${withheld.size} records withheld pending review.`,
      quarantined: [...withheld].map(([id, reason]) => ({ id, reason })),
    },
    schemes,
  };
  const envelope = validateCatalogueEnvelope(catalogue);
  if (!envelope.ok) throw new Error(envelope.errors.join('\n'));
  return catalogue;
}

if (isMain(import.meta.url)) {
  try {
    const records = loadSchemeRecords().map((e) => e.record);
    const release = JSON.parse(readFileSync(releasePath, 'utf8'));
    const catalogue = buildCatalogue(records, {
      registry: readRegistry(),
      release,
      snapshotHashes: collectSnapshotHashes(records),
      evaluatedAt: process.env.CATALOGUE_EVALUATION_DATE ?? new Date().toISOString().slice(0, 10),
    });
    const content = `${JSON.stringify(catalogue, null, 2)}\n`;
    for (const output of [serverOutput, clientOutput]) {
      mkdirSync(new URL('.', output), { recursive: true });
      writeFileSync(output, content);
    }
    writeFileSync(
      new URL('../src/data/income-thresholds.json', import.meta.url),
      `${JSON.stringify(collectIncomeThresholds(catalogue.schemes))}\n`,
    );
    console.log(catalogue.coverage.statement);
    console.log(`Catalogue ${catalogue.catalogueVersion}: ${fileURLToPath(serverOutput)}`);
  } catch (error) {
    console.error(`Catalogue build refused: ${error.message}`);
    process.exitCode = 1;
  }
}
