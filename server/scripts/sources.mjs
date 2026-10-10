#!/usr/bin/env node
// Explicit opt-in network command. Arguments such as --all reach the fetch stage.
import { spawnSync } from 'node:child_process';
for (const stage of ['fetch', 'extract', 'report']) {
  const script = new URL(`./sources/${stage}.mjs`, import.meta.url);
  const { fileURLToPath } = await import('node:url');
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(script), ...(stage === 'fetch' ? process.argv.slice(2) : [])],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
