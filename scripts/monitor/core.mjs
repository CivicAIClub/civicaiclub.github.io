const service = 'civicaiclub-site';
const revisionPattern = /^[a-f0-9]{40}$/i;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const stamp = () => new Date().toISOString();
const failure = code => Object.assign(new Error(code), { code });

function httpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function validConfig(config, base) {
  return config?.schemaVersion === 1 && Array.isArray(config.pages) && config.pages.length > 0 &&
    config.pages.every(page => typeof page?.path === 'string' && page.path.startsWith('/') &&
      !page.path.startsWith('//') && new URL(page.path, base).origin === base.origin &&
      Array.isArray(page.contains) && page.contains.length > 0 &&
      page.contains.every(text => typeof text === 'string' && text.trim().length > 0)) &&
    Array.isArray(config.formKeys) && config.formKeys.every(key => typeof key === 'string' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(key));
}

// Page bodies are checked in memory and discarded. A server cannot make us buffer an unlimited body.
async function limitedText(response, limit, signal) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw failure('timeout');
      if (done) break;
      size += value.byteLength;
      if (size > limit) { cancel(); throw failure('body-too-large'); }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks, size));
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

async function request(url, inspect, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  let response;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { reject(failure('timeout')); controller.abort(); }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        response = await fetchImpl(url, { method: 'GET', redirect: 'manual', credentials: 'omit',
          cache: 'no-store', signal: controller.signal, headers: { accept: '*/*' } });
        return { httpStatus: response.status, ...await inspect(response, controller.signal) };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    // Informational form requests never read the body; error/redirect bodies are discarded too.
    if (response?.body && !response.body.locked) void response.body.cancel().catch(() => {});
  }
}

function redirectCode(response, url) {
  if (response.status < 300 || response.status >= 400) return null;
  try {
    const location = new URL(response.headers.get('location') || '', url);
    return location.origin === new URL(url).origin ? 'unexpected-redirect' : 'cross-origin-redirect';
  } catch { return 'unexpected-redirect'; }
}

async function inspectVersion(response, signal, expectedSha, url) {
  if (redirectCode(response, url)) return { status: 'unknown', code: 'version-redirect' };
  if (response.status !== 200) return { status: 'unknown', code: 'version-http-error' };
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return { status: 'unknown', code: 'version-content-type' };
  let data;
  try { data = JSON.parse(await limitedText(response, 16 * 1024, signal)); }
  catch (error) {
    if (error.code) throw error;
    return { status: 'unknown', code: 'version-malformed' };
  }
  if (data?.schemaVersion !== 1 || data?.service !== service || !revisionPattern.test(data?.sourceRevision || '')) return { status: 'unknown', code: 'version-malformed' };
  const observedRevision = data.sourceRevision.toLowerCase();
  return { status: observedRevision === expectedSha ? 'healthy' : 'unhealthy',
    code: observedRevision === expectedSha ? 'ok' : 'revision-mismatch', observedRevision };
}

async function inspectPage(response, signal, page, url) {
  const redirect = redirectCode(response, url);
  if (redirect) return { status: 'unhealthy', code: redirect };
  // Also reject clients that unexpectedly followed a redirect despite redirect: manual.
  if (response.url && new URL(response.url).origin !== new URL(url).origin) return { status: 'unhealthy', code: 'cross-origin-redirect' };
  if (response.status !== 200) return { status: 'unhealthy', code: 'http-error' };
  if (!/^text\/html(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return { status: 'unhealthy', code: 'content-type' };
  const body = await limitedText(response, 2 * 1024 * 1024, signal);
  const matches = page.contains.every(text => body.includes(text));
  return { status: matches ? 'healthy' : 'unhealthy', code: matches ? 'ok' : 'content-mismatch' };
}

async function criticalCheck(target, options) {
  const started = performance.now();
  const check = { id: `${target.kind}:${target.path}`, kind: target.kind, critical: true,
    url: new URL(target.path, options.baseUrl).href, path: target.path, checkedAt: stamp(),
    expectedRevision: options.expectedSha, observedRevision: null, httpStatus: null, attempts: 0 };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const inspect = target.kind === 'version'
        ? (response, signal) => inspectVersion(response, signal, options.expectedSha, check.url)
        : (response, signal) => inspectPage(response, signal, target, check.url);
      Object.assign(check, { observedRevision: null, httpStatus: null }, await request(check.url, inspect, options));
    } catch (error) {
      Object.assign(check, { status: 'unknown', code: ['timeout', 'body-too-large'].includes(error.code) ? error.code : 'network-error', httpStatus: null, observedRevision: null });
    }
    check.attempts = attempt;
    if (check.status === 'healthy') break;
    if (attempt < 2) await options.sleep(options.retryDelayMs);
  }
  check.latencyMs = Math.round(performance.now() - started);
  return check;
}

async function formCheck(key, siteData, options) {
  const started = performance.now();
  const url = httpUrl(siteData?.[key]);
  // Keep raw Form IDs, redirect query strings and any account-specific response out of artifacts.
  const check = { id: `form:${key}`, kind: 'form', formKey: key, critical: false, status: 'informational',
    url: url ? `${url.origin}/[configured-form]` : null, path: null, checkedAt: stamp(),
    expectedRevision: options.expectedSha, observedRevision: null, httpStatus: null, attempts: 0,
    access: 'unknown', code: 'form-url-unavailable' };
  if (url) {
    check.attempts = 1;
    try {
      Object.assign(check, await request(url.href, async response => {
        if (response.status === 401) return { access: 'sign-in-required', code: 'known-access-baseline' };
        if (response.status >= 300 && response.status < 400) {
          let target;
          try { target = new URL(response.headers.get('location') || '', url); } catch {}
          const signIn = target?.hostname === 'accounts.google.com';
          return { access: signIn ? 'sign-in-required' : 'unknown', code: signIn ? 'known-access-baseline' : 'form-redirect' };
        }
        return response.status >= 200 && response.status < 300
          ? { access: 'reachable', code: 'http-reachable-only' }
          : { access: 'unavailable', code: 'form-http-error' };
      }, options));
    } catch { check.code = 'form-request-unavailable'; }
  }
  check.latencyMs = Math.round(performance.now() - started);
  return check;
}

/** Read-only probes. No response bodies or raw exception messages enter the report. */
export async function monitorSite({ baseUrl, expectedSha, config, siteData = {}, fetchImpl = fetch,
  sleep = pause, timeoutMs = 8000, retryDelayMs = 1000 } = {}) {
  const base = httpUrl(baseUrl);
  const report = { schemaVersion: 1, service, checkedAt: stamp(), baseUrl: base?.origin || null,
    expectedRevision: revisionPattern.test(expectedSha || '') ? expectedSha.toLowerCase() : null,
    observedRevision: null, status: 'unknown', checks: [] };
  if (!base || base.pathname !== '/' || base.search || base.hash || !report.expectedRevision || !validConfig(config, base) ||
    !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 ||
    !Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 10000) {
    report.checks.push({ id: 'configuration', kind: 'configuration', critical: true, status: 'unknown',
      code: 'invalid-configuration', url: null, path: null, checkedAt: stamp(), httpStatus: null,
      attempts: 0, latencyMs: 0, expectedRevision: report.expectedRevision, observedRevision: null });
  } else {
    const options = { baseUrl: base.origin, expectedSha: report.expectedRevision, fetchImpl, sleep, timeoutMs, retryDelayMs };
    const versionCheck = await criticalCheck({ kind: 'version', path: '/health.json' }, options);
    report.observedRevision = versionCheck.observedRevision;
    report.checks.push(versionCheck);
    for (const page of config.pages) {
      const check = await criticalCheck({ ...page, kind: 'page' }, options);
      check.observedRevision = report.observedRevision;
      report.checks.push(check);
    }
    for (const key of config.formKeys) report.checks.push(await formCheck(key, siteData, options));
    const critical = report.checks.filter(check => check.critical);
    report.status = critical.some(check => check.status === 'unhealthy') ? 'unhealthy'
      : critical.some(check => check.status !== 'healthy') ? 'unknown' : 'healthy';
  }
  report.finishedAt = stamp();
  return report;
}

export function renderMarkdown(report) {
  const cell = value => String(value ?? '—').replace(/[\r\n]/g, ' ').replace(/\|/g, '\\|').replace(/`/g, "'");
  return [
    '# Civic AI Club site health', '',
    `Status: **${report.status}**`,
    `Checked: ${report.checkedAt}`,
    `Site: ${report.baseUrl || 'not configured'}`, '',
    `Expected revision: ${report.expectedRevision || 'not configured'}`,
    `Observed revision: ${report.observedRevision || 'not observed'}`, '',
    '| Check | Importance | Result | HTTP | Attempts | Elapsed ms |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.checks.map(check => `| ${cell(check.path || check.formKey || check.id)} | ${check.critical ? 'critical' : 'informational'} | ${cell(check.status)}: ${cell(check.access || check.code)} | ${cell(check.httpStatus)} | ${check.attempts} | ${check.latencyMs} |`), '',
    'Any unhealthy or unknown critical check fails this run. Informational form checks do not affect site health.',
    'Form checks are anonymous GET access observations only. A sign-in requirement is a known baseline; an HTTP success does not verify form completion. No form is submitted.',
    'Critical page redirects are rejected, including redirects to the homepage. Reports contain no response bodies or raw form URLs.', '',
  ].join('\n');
}
