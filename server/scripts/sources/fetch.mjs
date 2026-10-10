#!/usr/bin/env node
/**
 * sources:fetch — registry to snapshots (addendum §4).
 *
 * Downloads only URLs listed in the reviewed registry, honours robots.txt and
 * per-host spacing, writes snapshot metadata to `sources/snapshots/`, and keeps
 * raw bytes out of git in `.cache/sources/`.
 *
 * Usage:
 *   node scripts/sources/fetch.mjs                 only entries whose checkEvery has elapsed
 *   node scripts/sources/fetch.mjs --all           ignore checkEvery
 *   node scripts/sources/fetch.mjs --source src-1  one source
 *   node scripts/sources/fetch.mjs --dry-run       plan only, no requests
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchSource, HostScheduler, isApprovedUrl } from './lib/http.mjs';
import { isAllowed } from './lib/robots.mjs';
import { sha256 } from './lib/normalise.mjs';
import {
  CACHE_DIR,
  SNAPSHOT_DIR,
  assertSafeId,
  durationToMs,
  ensureDir,
  fileTimestamp,
  isMain,
  latestSnapshot,
  parseArgs,
  readRegistry,
} from './lib/paths.mjs';

const TYPE_ALIASES = {
  'application/pdf': ['application/pdf', 'application/octet-stream'],
  'text/html': ['text/html', 'application/xhtml+xml'],
  'text/plain': ['text/plain'],
  'application/xhtml+xml': ['application/xhtml+xml', 'text/html'],
};

/** A fetch is due when it has never run, or `checkEvery` has elapsed. */
export function isDue(entry, snapshot, now) {
  if (!snapshot) return true;
  const last = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= durationToMs(entry.checkEvery);
}

/** Decide the snapshot outcome from the response and the previous snapshot. */
export function classify({ result, entry, previous, rawSha256 }) {
  if (result.outcome !== 'ok') return result.outcome;
  const expected = TYPE_ALIASES[entry.expectedType] ?? [entry.expectedType];
  const contentType = (result.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType && !expected.includes(contentType)) return 'type-mismatch';
  if (!previous?.rawSha256) return 'new';
  return previous.rawSha256 === rawSha256 ? 'unchanged' : 'changed';
}

async function loadRobots(host, scheduler, userAgent, cache, fetchImpl) {
  if (cache.has(host)) return cache.get(host);
  const url = `https://${host}/robots.txt`;
  const result = await fetchSource(url, {
    userAgent,
    allowedHosts: new Set([host]),
    allowedUrls: new Set([url]),
    fetchImpl,
    scheduler,
    sleepFn: scheduler.sleepFn,
    maxBytes: 512 * 1024,
  });
  // Missing, redirected, throttled or unreadable robots files fail closed.
  const text = result.outcome === 'ok' ? result.buffer.toString('utf8') : null;
  cache.set(host, text);
  return text;
}

/**
 * Run one fetch pass over the registry.
 * @returns {Promise<object[]>} the snapshots written
 */
export async function runFetch(options = {}) {
  const {
    registry = readRegistry(),
    now = Date.now(),
    only = null,
    all = false,
    dryRun = false,
    fetchImpl = globalThis.fetch,
    scheduler = new HostScheduler(),
    snapshotDir = SNAPSHOT_DIR,
    cacheDir = CACHE_DIR,
    log = console.log,
  } = options;

  const allowedHosts = new Set(Object.keys(registry.hosts));
  const allowedUrls = new Set(registry.entries.map((entry) => entry.url));
  // Validate every URL before any request (including a robots request).
  for (const entry of registry.entries) {
    assertSafeId(entry.sourceId);
    if (!isApprovedUrl(entry.url, { allowedHosts, allowedUrls }))
      throw new Error(`Unapproved or unsafe registry URL: ${entry.url}`);
  }
  for (const [host, config] of Object.entries(registry.hosts))
    scheduler.setInterval(host, config.minIntervalMs);

  const robotsCache = new Map();
  const skippedHosts = new Set();
  const written = [];

  for (const entry of registry.entries) {
    assertSafeId(entry.sourceId);
    if (only && entry.sourceId !== only) continue;

    const url = new URL(entry.url);
    const hostConfig = registry.hosts[url.hostname];
    const previous = latestSnapshot(entry.sourceId);

    const base = {
      sourceId: entry.sourceId,
      schemeId: entry.schemeId,
      url: entry.url,
      fetchedAt: new Date(now).toISOString(),
    };

    const record = (extra) => {
      const snapshot = { ...base, ...extra };
      if (dryRun) {
        log(`[dry-run] ${entry.sourceId}: would record "${snapshot.outcome}"`);
        return snapshot;
      }
      const dir = ensureDir(join(snapshotDir, entry.sourceId));
      writeFileSync(
        join(dir, `${fileTimestamp(new Date(now))}.json`),
        `${JSON.stringify(snapshot, null, 2)}\n`,
      );
      written.push(snapshot);
      log(
        `${entry.sourceId}: ${snapshot.outcome}${snapshot.status ? ` (${snapshot.status})` : ''}`,
      );
      return snapshot;
    };

    if (!hostConfig) {
      record({ outcome: 'robots-blocked', detail: `Host ${url.hostname} is not in the registry.` });
      continue;
    }
    if (
      hostConfig.automatedChecks !== 'allowed' ||
      !hostConfig.robotsChecked ||
      !hostConfig.termsChecked
    ) {
      record({
        outcome: 'robots-blocked',
        detail:
          'Host is manual-only in the registry: no machine-readable permission has been confirmed, so a person checks this source by hand.',
      });
      continue;
    }
    if (skippedHosts.has(url.hostname)) {
      log(`${entry.sourceId}: host skipped for this run`);
      continue;
    }
    if (!all && !isDue(entry, previous, now)) {
      log(`${entry.sourceId}: not due`);
      continue;
    }
    if (dryRun) {
      log(`[dry-run] ${entry.sourceId}: would fetch ${entry.url}`);
      continue;
    }

    const robots = await loadRobots(
      url.hostname,
      scheduler,
      registry.userAgent,
      robotsCache,
      fetchImpl,
    );
    if (robots === null || !isAllowed(robots, registry.userAgent, url.pathname + url.search)) {
      record({
        outcome: 'robots-blocked',
        detail:
          robots === null
            ? 'robots.txt could not be loaded safely; refusing source request.'
            : `robots.txt disallows ${url.pathname}`,
      });
      continue;
    }

    const result = await fetchSource(entry.url, {
      userAgent: registry.userAgent,
      allowedHosts,
      allowedUrls,
      scheduler,
      sleepFn: scheduler.sleepFn,
      beforeRequest: async (target) => {
        const next = new URL(target);
        const config = registry.hosts[next.hostname];
        if (
          config?.automatedChecks !== 'allowed' ||
          !config.robotsChecked ||
          !config.termsChecked ||
          skippedHosts.has(next.hostname)
        )
          return false;
        const policy = await loadRobots(
          next.hostname,
          scheduler,
          registry.userAgent,
          robotsCache,
          fetchImpl,
        );
        return (
          policy !== null && isAllowed(policy, registry.userAgent, next.pathname + next.search)
        );
      },
      etag: previous?.etag,
      lastModified: previous?.lastModified,
      fetchImpl,
    });

    if (result.outcome === 'host-skipped') {
      skippedHosts.add(new URL(result.finalUrl ?? entry.url).hostname);
      record({
        outcome: 'http-error',
        status: result.status,
        detail:
          result.detail ??
          `Retry-After ${Math.round((result.retryAfterMs ?? 0) / 1000)}s exceeds 10 minutes; host skipped for this run.`,
      });
      continue;
    }

    const rawSha256 = result.buffer ? sha256(result.buffer) : undefined;
    const outcome = classify({ result, entry, previous, rawSha256 });

    if (result.buffer && outcome !== 'type-mismatch') {
      const dir = ensureDir(join(cacheDir, entry.sourceId));
      writeFileSync(join(dir, `${rawSha256}.bin`), result.buffer);
    }

    record({
      finalUrl: result.finalUrl ?? entry.url,
      status: result.status,
      contentType: result.headers?.['content-type'],
      bytes: result.bytes,
      etag: result.headers?.etag,
      lastModified: result.headers?.['last-modified'],
      rawSha256,
      rawPath: rawSha256 ? `.cache/sources/${entry.sourceId}/${rawSha256}.bin` : undefined,
      outcome,
      detail: result.detail,
    });
  }

  return written;
}

if (isMain(import.meta.url)) {
  const args = parseArgs();
  const written = await runFetch({
    all: Boolean(args.all),
    only: typeof args.source === 'string' ? args.source : null,
    dryRun: Boolean(args['dry-run']),
  });
  console.log(`\n${written.length} snapshot(s) written.`);
}
