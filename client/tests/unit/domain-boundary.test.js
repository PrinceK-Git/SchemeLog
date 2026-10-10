import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = new URL('../../', import.meta.url);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test('domain modules have no hidden clock, effects, React or server-tool imports', () => {
  for (const path of files(new URL('src/domain/', root))) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*)['"](?:node:|react|.*server\/.*\.js)/,
      path.href,
    );
    assert.doesNotMatch(
      source,
      /\b(?:fetch|localStorage|sessionStorage|console|Date\.now)\s*[.(]|new Date\s*\(\s*\)/,
      path.href,
    );
  }
});

test('unwired Phase 3 core bundles for the browser and executes without Node tooling', async () => {
  const entry = fileURLToPath(new URL('phase3-smoke-entry.js', root));
  const result = await build({
    configFile: false,
    root: fileURLToPath(root),
    logLevel: 'silent',
    plugins: [
      {
        name: 'phase3-test-entry',
        resolveId(id) {
          if (id === entry) return id;
        },
        load(id) {
          if (id !== entry) return null;
          return `
          import { evaluateCatalogue } from '/src/domain/eligibility/evaluate.js';
          import { normalizeProfile } from '/src/domain/profile/normalize.js';
          import { demoCatalogue, demoContext, referenceProfile } from '/src/data/demo-catalogue.js';
          export const results = evaluateCatalogue(referenceProfile, demoCatalogue, demoContext);
          export { normalizeProfile };
        `;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'phase3-smoke' },
    },
  });
  const chunks = (
    Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  ).filter((item) => item.type === 'chunk');
  assert.equal(chunks.length, 1);
  const code = chunks[0].code;
  assert.doesNotMatch(
    code,
    /node:fs|node:path|pdfjs|readFileSync|sch-nmmss|sch-pm-usp-csss|sch-pm-usp-sss-jk-ladakh/,
  );
  const bundled = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  assert.deepEqual(
    bundled.results.map((item) => item.status),
    ['potential', 'verification', 'unmet', 'unavailable'],
  );
  assert.equal(typeof bundled.normalizeProfile, 'function');
});
