/**
 * Polite, sequential-per-host HTTP for the source fetcher (addendum §4).
 * It stops rather than retrying aggressively, and never sends cookies,
 * credentials, or form posts.
 */

export const REQUEST_POLICY = {
  timeoutMs: 30_000,
  maxRedirects: 3,
  maxBytes: 25 * 1024 * 1024,
  retries: 2,
  backoffMs: [10_000, 30_000],
  retryAfterSkipMs: 10 * 60 * 1000,
  defaultIntervalMs: 5_000,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Serialises requests per host and enforces each host's minimum spacing. */
export class HostScheduler {
  constructor({ sleepFn = sleep, now = () => Date.now() } = {}) {
    this.lastRequestAt = new Map();
    this.queues = new Map();
    this.intervals = new Map();
    this.sleepFn = sleepFn;
    this.now = now;
  }

  setInterval(host, ms) {
    this.intervals.set(host, Math.max(REQUEST_POLICY.defaultIntervalMs, ms || 0));
  }

  /** @template T @param {string} host @param {() => Promise<T>} task @returns {Promise<T>} */
  run(host, task) {
    const previous = this.queues.get(host) ?? Promise.resolve();
    const next = previous.then(async () => {
      const last = this.lastRequestAt.get(host);
      const interval = this.intervals.get(host) ?? REQUEST_POLICY.defaultIntervalMs;
      if (last !== undefined) {
        const wait = last + interval - this.now();
        if (wait > 0) await this.sleepFn(wait);
      }
      this.lastRequestAt.set(host, this.now());
      return task();
    });
    this.queues.set(
      host,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }
}

/** Read a body with a hard size cap; aborts the stream when the cap is passed. */
async function readCapped(response, maxBytes) {
  const chunks = [];
  let total = 0;
  if (!response.body) return { tooLarge: false, bytes: 0, buffer: Buffer.alloc(0) };
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        return { tooLarge: true, bytes: total, buffer: null };
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return { tooLarge: false, bytes: total, buffer: Buffer.concat(chunks) };
}

/** Parse a `Retry-After` header: delta-seconds or an HTTP date. */
export function parseRetryAfter(header, now = Date.now()) {
  if (!header?.trim()) return null;
  if (/^\d+$/.test(header.trim())) return Number(header) * 1000;
  if (/^[+-]?[\d.]+$/.test(header.trim())) return null;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

/** Exact reviewed URL membership is mandatory, including for redirects. */
export function isApprovedUrl(target, options) {
  try {
    const url = new URL(target);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.port &&
      options.allowedHosts?.has(url.hostname) &&
      options.allowedUrls?.has(target)
    );
  } catch {
    return false;
  }
}

/** Deadline covers headers AND the streamed body, even if a mock ignores abort. */
async function requestOnce(target, headers, settings) {
  const controller = new AbortController();
  let response;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('Request timeout'), { name: 'AbortError' }));
    }, settings.timeoutMs);
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        response = await settings.fetchImpl(target, {
          headers,
          redirect: 'manual',
          signal: controller.signal,
          credentials: 'omit',
        });
        const status = response.status;
        const result = { status, headers: Object.fromEntries(response.headers), finalUrl: target };
        if (status < 200 || status >= 300) {
          void response.body?.cancel().catch(() => {});
          return result;
        }
        const declared = Number(response.headers.get('content-length'));
        if (declared > settings.maxBytes) {
          controller.abort();
          void response.body?.cancel().catch(() => {});
          return { ...result, outcome: 'too-large', bytes: declared };
        }
        const body = await readCapped(response, settings.maxBytes);
        if (body.tooLarge) controller.abort();
        return { ...result, ...body, outcome: body.tooLarge ? 'too-large' : 'ok' };
      })(),
    ]);
  } catch (error) {
    controller.abort();
    return {
      outcome: error.name === 'AbortError' ? 'timeout' : 'http-error',
      detail: error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch one registry URL under the full request policy.
 *
 * @param {string} url
 * @param {{
 *   userAgent: string,
 *   allowedHosts: Set<string>,
 *   allowedUrls: Set<string>,
 *   scheduler?: HostScheduler,
 *   beforeRequest?: (url: string) => Promise<boolean>,
 *   etag?: string,
 *   lastModified?: string,
 *   fetchImpl?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   maxBytes?: number,
 *   timeoutMs?: number
 * }} options
 * @returns {Promise<{
 *   outcome: string, status?: number, finalUrl?: string, headers?: Record<string,string>,
 *   buffer?: Buffer|null, bytes?: number, retryAfterMs?: number|null, detail?: string
 * }>}
 */
export async function fetchSource(url, options) {
  const settings = {
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    sleepFn: options.sleepFn ?? sleep,
    maxBytes: options.maxBytes ?? REQUEST_POLICY.maxBytes,
    timeoutMs: options.timeoutMs ?? REQUEST_POLICY.timeoutMs,
  };
  const scheduler = options.scheduler ?? new HostScheduler({ sleepFn: settings.sleepFn });

  const headers = { 'User-Agent': options.userAgent, Accept: '*/*' };
  if (options.etag) headers['If-None-Match'] = options.etag;
  if (options.lastModified) headers['If-Modified-Since'] = options.lastModified;

  let target = url;
  for (let redirects = 0; redirects <= REQUEST_POLICY.maxRedirects; redirects += 1) {
    if (!isApprovedUrl(target, options)) {
      return {
        outcome: 'redirect-blocked',
        finalUrl: target,
        detail: 'URL is not an exact approved HTTPS URL.',
      };
    }
    if (options.beforeRequest && !(await options.beforeRequest(target))) {
      return {
        outcome: 'robots-blocked',
        finalUrl: target,
        detail: 'Robots policy unavailable or disallows URL.',
      };
    }
    let result;
    for (let attempt = 0; attempt <= REQUEST_POLICY.retries; attempt += 1) {
      result = await scheduler.run(new URL(target).hostname, () =>
        requestOnce(target, headers, settings),
      );
      const retryable =
        result.status === 429 ||
        result.status >= 500 ||
        (!result.status && result.outcome === 'http-error');
      if (!retryable) break;
      const retryAfterMs = parseRetryAfter(result.headers?.['retry-after']);
      if (retryAfterMs !== null && retryAfterMs > REQUEST_POLICY.retryAfterSkipMs) {
        return { ...result, outcome: 'host-skipped', retryAfterMs };
      }
      if (attempt === REQUEST_POLICY.retries) {
        return {
          ...result,
          outcome: 'host-skipped',
          retryAfterMs,
          detail: 'Retry budget exhausted; host skipped for this run.',
        };
      }
      await settings.sleepFn(Math.max(retryAfterMs ?? 0, REQUEST_POLICY.backoffMs[attempt]));
    }
    const status = result.status;
    if (status === 304) return { ...result, outcome: 'not-modified' };
    if (status >= 300 && status < 400) {
      const location = result.headers.location;
      if (!location) return { ...result, outcome: 'http-error' };
      try {
        target = new URL(location, target).href;
      } catch {
        return { ...result, outcome: 'redirect-blocked', detail: 'Invalid redirect URL.' };
      }
      continue;
    }
    return status >= 400 ? { ...result, outcome: 'http-error' } : result;
  }

  return { outcome: 'redirect-blocked', detail: 'Too many redirects.' };
}
