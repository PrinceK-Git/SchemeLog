#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { validateRegistry } from '../src/domain/validation/validateCatalogue.js';
import { loadSchemeRecords } from './validate-catalogue.mjs';
import { isMain, readRegistry, durationToMs } from './sources/lib/paths.mjs';

/** Cross-check the reviewed registry without making network requests. */
export function checkRegistry(registry, records, today = new Date().toISOString().slice(0, 10)) {
  const schema = validateRegistry(registry);
  if (!schema.ok) return schema;
  const errors = [];
  const ids = new Set();
  for (const [host, config] of Object.entries(registry.hosts)) {
    if (!/^[a-z0-9.-]+$/.test(host) || host.includes('..')) errors.push(`Invalid host: ${host}`);
    for (const key of ['robotsChecked', 'termsChecked'])
      if (config[key] > today) errors.push(`${host}: ${key} cannot be in the future.`);
  }
  for (const entry of registry.entries) {
    const url = new URL(entry.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash)
      errors.push(`${entry.sourceId}: HTTPS without credentials, port or fragment is required.`);
    if (!Object.hasOwn(registry.hosts, url.hostname))
      errors.push(`${entry.sourceId}: host not reviewed.`);
    if (ids.has(entry.sourceId))
      errors.push(`${entry.sourceId}: must be globally unique for snapshot storage.`);
    ids.add(entry.sourceId);
    if (entry.addedBy === entry.reviewedBy)
      errors.push(`${entry.sourceId}: independent URL review required.`);
    try {
      if (durationToMs(entry.checkEvery) <= 0)
        errors.push(`${entry.sourceId}: positive interval required.`);
    } catch {
      errors.push(`${entry.sourceId}: unsupported check interval.`);
    }
    const record = records.find((r) => r.id === entry.schemeId);
    const source = record?.sources?.find((s) => s.id === entry.sourceId);
    if (!source || source.url !== entry.url || source.kind !== entry.kind)
      errors.push(`${entry.sourceId}: scheme source ID, exact URL and kind must match.`);
    if (
      entry.kind === 'portal-page' &&
      entry.factGroups.some((g) => ['eligibility', 'benefits', 'documents'].includes(g))
    )
      errors.push(`${entry.sourceId}: discovery portals cannot verify material conditions.`);
  }
  for (const record of records.filter((r) => r.publicationStatus === 'published')) {
    for (const source of record.sources ?? []) {
      if (
        !registry.entries.some(
          (e) => e.schemeId === record.id && e.sourceId === source.id && e.url === source.url,
        )
      )
        errors.push(`${record.id}/${source.id}: published source missing from registry.`);
    }
    for (const link of record.links ?? []) {
      if (!registry.entries.some((e) => e.schemeId === record.id && e.url === link.url))
        errors.push(`${record.id}/${link.id}: published link requires an exact registry URL.`);
    }
  }
  return { ok: errors.length === 0, errors: errors.sort() };
}

if (isMain(import.meta.url)) {
  const report = checkRegistry(
    readRegistry(),
    loadSchemeRecords().map((e) => e.record),
  );
  for (const error of report.errors) console.error(error);
  console.log(
    report.ok ? 'Registry valid (empty allowlist is safe: no requests).' : 'Registry invalid.',
  );
  process.exitCode = report.ok ? 0 : 1;
}
