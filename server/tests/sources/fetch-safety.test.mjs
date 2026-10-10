import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchSource, HostScheduler, parseRetryAfter } from '../../scripts/sources/lib/http.mjs';
import { runFetch } from '../../scripts/sources/fetch.mjs';

const url = 'https://reviewed.example/source';
function setup(extra = {}) {
  let clock = 0;
  const waits = [];
  const sleepFn = async (ms) => {
    waits.push(ms);
    clock += ms;
  };
  return {
    waits,
    options: {
      userAgent: 'OfflineTest/1',
      allowedHosts: new Set(['reviewed.example']),
      allowedUrls: new Set([url]),
      sleepFn,
      scheduler: new HostScheduler({ sleepFn, now: () => clock }),
      ...extra,
    },
  };
}

test('HTTPS and exact URL preflight never invokes fetch for unsafe or unlisted input', async () => {
  for (const target of [
    'http://reviewed.example/source',
    'https://reviewed.example/other',
    'https://evil.example/source',
    'https://user:pass@reviewed.example/source',
    'https://reviewed.example:444/source',
    `${url}#fragment`,
    'not a URL',
  ]) {
    let calls = 0;
    const { options } = setup({
      fetchImpl: async () => {
        calls++;
        throw new Error('must not fetch');
      },
    });
    options.allowedUrls.add(target); // HTTPS/credential/port guards cannot be overridden by membership.
    if (target.endsWith('/other')) options.allowedUrls.delete(target);
    assert.equal((await fetchSource(target, options)).outcome, 'redirect-blocked', target);
    assert.equal(calls, 0);
  }
  const { options } = setup({
    allowedUrls: undefined,
    fetchImpl: () => assert.fail('missing allowlist'),
  });
  assert.equal((await fetchSource(url, options)).outcome, 'redirect-blocked');
});

test('same-host unlisted redirect is blocked before a second request', async () => {
  const calls = [];
  const { options } = setup({
    fetchImpl: async (target, init) => {
      calls.push(target);
      assert.equal(init.redirect, 'manual');
      return new Response(null, { status: 302, headers: { location: '/unreviewed' } });
    },
  });
  assert.equal((await fetchSource(url, options)).outcome, 'redirect-blocked');
  assert.deepEqual(calls, [url]);
});

test('approved redirect checks robots and preserves per-host spacing', async () => {
  const next = 'https://reviewed.example/next';
  const checked = [];
  let calls = 0;
  const { options, waits } = setup({
    allowedUrls: new Set([url, next]),
    beforeRequest: async (target) => {
      checked.push(target);
      return true;
    },
    fetchImpl: async () =>
      ++calls === 1
        ? new Response(null, { status: 302, headers: { location: '/next' } })
        : new Response('ok'),
  });
  assert.equal((await fetchSource(url, options)).outcome, 'ok');
  assert.deepEqual(checked, [url, next]);
  assert.deepEqual(waits, [5000]);
  calls = 0;
  options.beforeRequest = async (target) => target === url;
  assert.equal((await fetchSource(url, options)).outcome, 'robots-blocked');
  assert.equal(calls, 1);
});

for (const status of [429, 503]) {
  test(`${status} long Retry-After skips immediately without retry`, async () => {
    let calls = 0;
    const { options, waits } = setup({
      fetchImpl: async () => {
        calls++;
        return new Response('busy', { status, headers: { 'retry-after': '601' } });
      },
    });
    const result = await fetchSource(url, options);
    assert.equal(result.outcome, 'host-skipped');
    assert.equal(result.retryAfterMs, 601000);
    assert.equal(calls, 1);
    assert.deepEqual(waits, []);
  });
  test(`${status} short Retry-After is honored before bounded retry`, async () => {
    let calls = 0;
    const { options, waits } = setup({
      fetchImpl: async () =>
        ++calls === 1
          ? new Response('busy', { status, headers: { 'retry-after': '20' } })
          : new Response('ok'),
    });
    assert.equal((await fetchSource(url, options)).outcome, 'ok');
    assert.equal(calls, 2);
    assert.deepEqual(waits, [20000]);
  });
}

test('Retry-After supports HTTP dates and rejects malformed numeric values', () => {
  assert.equal(parseRetryAfter('Thu, 01 Jan 1970 00:00:20 GMT', 0), 20000);
  for (const value of [null, '', ' ', '-1', '1.5', 'invalid'])
    assert.equal(parseRetryAfter(value), null);
});

test('retry budget is bounded, with backoff even without Retry-After', async () => {
  let calls = 0;
  const { options, waits } = setup({
    fetchImpl: async () => {
      calls++;
      return new Response(null, { status: 503 });
    },
  });
  assert.equal((await fetchSource(url, options)).outcome, 'host-skipped');
  assert.equal(calls, 3);
  assert.deepEqual(waits, [10000, 30000]);
});

test('size cap cancels streamed body without requiring Content-Length', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  });
  const { options } = setup({ maxBytes: 10, fetchImpl: async () => new Response(body) });
  const result = await fetchSource(url, options);
  assert.equal(result.outcome, 'too-large');
  assert.equal(result.buffer, null);
  assert.equal(cancelled, true);
});

test('declared oversized body is rejected and cancelled before reading', async () => {
  let cancelled = false;
  const { options } = setup({
    maxBytes: 10,
    fetchImpl: async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { 'content-length': '11' } },
      ),
  });
  assert.equal((await fetchSource(url, options)).outcome, 'too-large');
  assert.equal(cancelled, true);
});

test('timeout remains active after headers while the body stalls', async () => {
  let signal;
  const { options } = setup({
    timeoutMs: 20,
    fetchImpl: async (_, init) => {
      signal = init.signal;
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener('abort', () =>
              controller.error(new DOMException('Aborted', 'AbortError')),
            );
          },
        }),
      );
    },
  });
  assert.equal((await fetchSource(url, options)).outcome, 'timeout');
  assert.equal(signal.aborted, true);
});

test('304 has no body and retains conditional request headers', async () => {
  const { options } = setup({
    etag: 'old',
    fetchImpl: async (_, init) => {
      assert.equal(init.headers['If-None-Match'], 'old');
      return new Response(null, { status: 304 });
    },
  });
  assert.equal((await fetchSource(url, options)).outcome, 'not-modified');
});

function registry(target = url) {
  return {
    userAgent: 'OfflineTest/1',
    hosts: {
      'reviewed.example': {
        automatedChecks: 'allowed',
        minIntervalMs: 5000,
        robotsChecked: '2026-01-01',
        termsChecked: '2026-01-01',
      },
    },
    entries: [
      {
        sourceId: 'src-offline-fixture',
        schemeId: 'sch-offline',
        url: target,
        expectedType: 'text/plain',
        checkEvery: 'P1D',
      },
    ],
  };
}

for (const status of [404, 403, 503]) {
  test(`robots ${status} fails closed: no source request`, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'schemelog-fetch-test-'));
    const calls = [];
    try {
      const result = await runFetch({
        registry: registry(),
        all: true,
        snapshotDir: dir,
        cacheDir: dir,
        scheduler: setup().options.scheduler,
        log() {},
        fetchImpl: async (target) => {
          calls.push(target);
          return new Response('unavailable', { status, headers: { 'retry-after': '601' } });
        },
      });
      assert.deepEqual(calls, ['https://reviewed.example/robots.txt']);
      assert.equal(result[0].outcome, 'robots-blocked');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('registry preflight rejects unsafe entries before even fetching robots', async () => {
  await assert.rejects(
    runFetch({
      registry: registry('http://reviewed.example/source'),
      fetchImpl: () => assert.fail('must not fetch'),
    }),
    /unsafe registry URL/,
  );
});

test('robots network errors fail closed after bounded retries', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'schemelog-fetch-test-'));
  const calls = [];
  const { options, waits } = setup();
  try {
    const result = await runFetch({
      registry: registry(),
      all: true,
      snapshotDir: dir,
      cacheDir: dir,
      scheduler: options.scheduler,
      log() {},
      fetchImpl: async (target) => {
        calls.push(target);
        throw new Error('offline network failure');
      },
    });
    assert.deepEqual(calls, Array(3).fill('https://reviewed.example/robots.txt'));
    assert.deepEqual(waits, [10000, 30000]);
    assert.equal(result[0].outcome, 'robots-blocked');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('robots disallow prevents fetching the source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'schemelog-fetch-test-'));
  const calls = [];
  try {
    const result = await runFetch({
      registry: registry(),
      all: true,
      snapshotDir: dir,
      cacheDir: dir,
      scheduler: setup().options.scheduler,
      log() {},
      fetchImpl: async (target) => {
        calls.push(target);
        return new Response('User-agent: *\nDisallow: /source');
      },
    });
    assert.deepEqual(calls, ['https://reviewed.example/robots.txt']);
    assert.equal(result[0].outcome, 'robots-blocked');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unknown automatedChecks value cannot authorize any request', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'schemelog-fetch-test-'));
  const input = registry();
  delete input.hosts['reviewed.example'].automatedChecks;
  try {
    const result = await runFetch({
      registry: input,
      all: true,
      snapshotDir: dir,
      cacheDir: dir,
      log() {},
      fetchImpl: () => assert.fail('unreviewed host must not be requested'),
    });
    assert.equal(result[0].outcome, 'robots-blocked');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('empty reviewed registry is an offline no-op', async () => {
  assert.deepEqual(
    await runFetch({
      registry: { hosts: {}, entries: [] },
      fetchImpl: () => assert.fail('must not fetch'),
    }),
    [],
  );
});
