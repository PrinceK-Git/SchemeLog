import { readFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = resolve(here, '..', '..', '..');
export const SOURCES_DIR = join(SERVER_ROOT, 'sources');
export const SNAPSHOT_DIR = join(SOURCES_DIR, 'snapshots');
export const TEXT_DIR = join(SOURCES_DIR, 'text');
export const DIFF_DIR = join(SOURCES_DIR, 'diffs');
export const REGISTRY_PATH = join(SOURCES_DIR, 'registry.json');
export const CACHE_DIR = join(SERVER_ROOT, '.cache', 'sources');
export const SCHEMES_DIR = join(SERVER_ROOT, 'src', 'data', 'schemes');

/**
 * Identifiers only ever come from the registry, never from a URL or a response
 * header, so a hostile source cannot steer a write outside these folders.
 */
export function assertSafeId(id) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error(`Unsafe identifier: ${id}`);
  return id;
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
  return path;
}

export function readRegistry(path = REGISTRY_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Snapshot files are named by UTC timestamp, so sorting by name sorts by time. */
export function listSnapshots(sourceId) {
  const dir = join(SNAPSHOT_DIR, assertSafeId(sourceId));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({ file, path: join(dir, file) }));
}

/** @returns {object | null} the most recent snapshot for a source */
export function latestSnapshot(sourceId) {
  const snapshots = listSnapshots(sourceId);
  if (snapshots.length === 0) return null;
  return JSON.parse(readFileSync(snapshots.at(-1).path, 'utf8'));
}

/** The most recent snapshot that actually produced stored text. */
export function latestTextSnapshot(sourceId) {
  for (const { path } of listSnapshots(sourceId).reverse()) {
    const snapshot = JSON.parse(readFileSync(path, 'utf8'));
    if (snapshot.textSha256 && snapshot.textPath) return snapshot;
  }
  return null;
}

/** ISO 8601 duration (days/hours/minutes) to milliseconds. */
export function durationToMs(duration) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration: ${duration}`);
  const [, days = 0, hours = 0, minutes = 0] = match;
  return (Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60) * 1000;
}

/** Timestamp used in snapshot filenames: safe on Windows and sortable. */
export function fileTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** True when this module is the entry point, on Windows paths too. */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  return resolve(fileURLToPath(metaUrl)) === resolve(process.argv[1]);
}

/** Parse `--flag value` and `--flag` arguments without a dependency. */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}
