import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const VOCAB_DIR = join(here, '..', '..', 'data', 'vocab');

/**
 * Load every controlled vocabulary once. Codes are compared, labels never are.
 * @returns {{ version: string, codes: Record<string, Set<string>>, files: Record<string, any> }}
 */
export function loadVocabularies(dir = VOCAB_DIR) {
  const codes = {};
  const files = {};
  const versions = new Set();
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const name = parsed.vocabulary || basename(file, '.json');
    files[name] = parsed;
    codes[name] = new Set((parsed.entries || []).map((entry) => entry.code));
    if (parsed.vocabVersion) versions.add(parsed.vocabVersion);
  }
  // One version string for the envelope: highest when files agree, else a joined list.
  const version = versions.size === 1 ? [...versions][0] : [...versions].sort().join('+');
  return { version: version || '0.0.0', codes, files };
}

export {
  FIELD_VOCABULARY,
  NUMERIC_FIELDS,
  SCORE_FIELDS,
} from '../../../../client/src/domain/profile/fields.js';
