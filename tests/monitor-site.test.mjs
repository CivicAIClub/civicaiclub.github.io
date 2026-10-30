import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const sha = 'a'.repeat(40);
const baseUrl = 'https://club.example';
const config = { schemaVersion: 1, pages: [{ path: '/', contains: ['Civic AI Club'] }], formKeys: [] };

function version(revision = sha, extra = {}) {
  return new Response(JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: revision, ...extra }), { headers: { 'content-type': 'application/json' } });
}

function page(body = '<html><title>Civic AI Club</title></html>') {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function run(overrides = {}) {
  const { monitorSite } = await core();
  return monitorSite({ baseUrl, expectedSha: sha, config, siteData: {}, retryDelayMs: 0,
    fetchImpl: async url => url.endsWith('/health.json') ? version() : page(), ...overrides });
}

async function core() {
  const loaded = await import('../scripts/monitor/core.mjs').catch(() => ({}));
  assert.equal(typeof loaded.monitorSite, 'function', 'The monitor must expose its executable health-check contract');
  return loaded;
}

test('matching deployed revision and expected HTML make the site healthy without saving bodies', async () => {
  const { monitorSite } = await core();
  const report = await monitorSite({
    baseUrl, expectedSha: sha, config, siteData: {}, retryDelayMs: 0,
    fetchImpl: async (url, options) => {
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.credentials, 'omit');
      return url.endsWith('/health.json')
        ? new Response(JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: sha }), { headers: { 'content-type': 'application/json' } })
        : new Response('<html><title>Civic AI Club</title><p>BODY_NOT_FOR_REPORTS</p></html>', { headers: { 'content-type': 'text/html' } });
    },
  });
  assert.equal(report.status, 'healthy');
  assert.equal(report.expectedRevision, sha);
  assert.equal(report.observedRevision, sha);
  assert.equal(report.checks.length, 2);
  assert.ok(report.checks.every(check => check.status === 'healthy' && check.attempts === 1));
  assert.ok(report.checks.every(check => Number.isFinite(check.latencyMs) && check.latencyMs >= 0 && !Number.isNaN(Date.parse(check.checkedAt))));
  assert.equal(JSON.stringify(report).includes('BODY_NOT_FOR_REPORTS'), false);
});

test('a stale but otherwise valid deployment is unhealthy after at most two checks', async () => {
  let requests = 0;
  const report = await run({ fetchImpl: async url => {
    if (url.endsWith('/health.json')) { requests++; return version('b'.repeat(40)); }
    return page();
  } });
  assert.equal(report.status, 'unhealthy');
  assert.equal(report.observedRevision, 'b'.repeat(40));
  assert.equal(report.checks[0].code, 'revision-mismatch');
  assert.equal(report.checks[0].attempts, 2);
  assert.equal(requests, 2);
});

for (const [name, response] of [
  ['missing endpoint', () => new Response('Not found', { status: 404 })],
  ['invalid JSON', () => new Response('not JSON', { headers: { 'content-type': 'application/json' } })],
  ['missing revision', () => version(undefined, { sourceRevision: undefined })],
  ['malformed revision', () => version('main')],
  ['wrong service', () => version(sha, { service: 'other-site' })],
  ['wrong schema', () => version(sha, { schemaVersion: 2 })],
  ['HTML masquerading as JSON', () => new Response(JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: sha }), { headers: { 'content-type': 'text/html' } })],
]) {
  test(`${name} cannot produce a healthy version result`, async () => {
    const report = await run({ fetchImpl: async url => url.endsWith('/health.json') ? response() : page() });
    assert.equal(report.status, 'unknown');
    assert.equal(report.observedRevision, null);
    assert.equal(report.checks[0].status, 'unknown');
    assert.equal(report.checks[0].attempts, 2);
  });
}

for (const [name, response, code] of [
  ['HTTP 404', () => new Response('Civic AI Club', { status: 404 }), 'http-error'],
  ['empty HTTP 200', () => page(''), 'content-mismatch'],
  ['wrong HTTP 200', () => page('<html><h1>Temporarily unavailable</h1></html>'), 'content-mismatch'],
  ['plain-text HTTP 200', () => new Response('Civic AI Club'), 'content-type'],
  ['cross-origin redirect', () => new Response(null, { status: 302, headers: { location: 'https://unexpected.example/' } }), 'cross-origin-redirect'],
  ['redirect to the homepage', () => new Response(null, { status: 302, headers: { location: '/' } }), 'unexpected-redirect'],
]) {
  test(`${name} is unhealthy instead of treating any HTTP response as success`, async () => {
    const report = await run({ fetchImpl: async url => url.endsWith('/health.json') ? version() : response() });
    const check = report.checks.find(item => item.kind === 'page');
    assert.equal(report.status, 'unhealthy');
    assert.equal(check.code, code);
    assert.equal(check.attempts, 2);
  });
}

test('a transient critical failure is retried once with the requested delay', async () => {
  let pageRequests = 0;
  const delays = [];
  const report = await run({ retryDelayMs: 23, sleep: async ms => delays.push(ms), fetchImpl: async url => {
    if (url.endsWith('/health.json')) return version();
    pageRequests++;
    if (pageRequests === 1) throw new Error('private server detail');
    return page();
  } });
  assert.equal(report.status, 'healthy');
  assert.equal(report.checks.find(check => check.kind === 'page').attempts, 2);
  assert.deepEqual(delays, [23]);
  assert.equal(JSON.stringify(report).includes('private server detail'), false);
});

test('persistent network failure is unknown with bounded attempts and no exception payload', async () => {
  const report = await run({ fetchImpl: async () => { throw new Error('TOKEN_DO_NOT_LOG'); } });
  assert.equal(report.status, 'unknown');
  assert.ok(report.checks.every(check => check.attempts === 2 && check.code === 'network-error'));
  assert.equal(JSON.stringify(report).includes('TOKEN_DO_NOT_LOG'), false);
});

test('the deadline covers a response body that never finishes', async () => {
  const result = await Promise.race([
    run({ timeoutMs: 15, fetchImpl: async url => url.endsWith('/health.json') ? version() : new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'text/html' } }) }),
    new Promise(resolve => setTimeout(() => resolve({ status: 'unbounded' }), 300)),
  ]);
  assert.equal(result.status, 'unknown');
  assert.equal(result.checks.find(check => check.kind === 'page').code, 'timeout');
});

test('critical response size is bounded instead of storing or reading an unlimited body', async () => {
  const report = await run({ fetchImpl: async url => url.endsWith('/health.json') ? version() : page('Civic AI Club' + 'x'.repeat(2 * 1024 * 1024 + 1)) });
  assert.equal(report.status, 'unknown');
  assert.equal(report.checks.find(check => check.kind === 'page').code, 'body-too-large');
});

test('invalid expected revision or cross-origin page configuration never produces a green empty report', async () => {
  for (const overrides of [
    { expectedSha: '' },
    { config: { schemaVersion: 1, pages: [], formKeys: [] } },
    { config: { schemaVersion: 1, pages: [{ path: '//other.example/', contains: ['Civic'] }], formKeys: [] } },
    { config: { schemaVersion: 1, pages: [{ path: '/', contains: [] }], formKeys: [] } },
  ]) {
    let calls = 0;
    const report = await run({ ...overrides, fetchImpl: async () => { calls++; return page(); } });
    assert.equal(report.status, 'unknown');
    assert.equal(report.checks[0].critical, true);
    assert.equal(calls, 0);
  }
});

test('anonymous form access is informational and form response bodies and IDs are never recorded', async () => {
  const siteData = { intakeFormUrl: 'https://forms.example/PRIVATE_FORM_ID/view', joinFormUrl: 'https://forms.example/SECOND_PRIVATE_ID/view' };
  const report = await run({ config: { ...config, formKeys: ['intakeFormUrl', 'joinFormUrl'] }, siteData,
    fetchImpl: async url => {
      if (url === siteData.intakeFormUrl) return new Response('PRIVATE_FORM_RESPONSE', { status: 401 });
      if (url === siteData.joinFormUrl) return new Response('PRIVATE_SIGNIN_RESPONSE', { status: 302, headers: { location: 'https://accounts.google.com/ServiceLogin?private=secret' } });
      return url.endsWith('/health.json') ? version() : page();
    },
  });
  assert.equal(report.status, 'healthy');
  const forms = report.checks.filter(check => check.kind === 'form');
  assert.equal(forms.length, 2);
  assert.ok(forms.every(check => check.critical === false && check.status === 'informational' && check.access === 'sign-in-required' && check.attempts === 1));
  for (const privateText of ['PRIVATE_FORM_ID', 'SECOND_PRIVATE_ID', 'PRIVATE_FORM_RESPONSE', 'PRIVATE_SIGNIN_RESPONSE', 'private=secret']) assert.equal(JSON.stringify(report).includes(privateText), false);
});

test('missing or failed form checks do not create a critical outage', async () => {
  const report = await run({ config: { ...config, formKeys: ['intakeFormUrl', 'joinFormUrl'] }, siteData: { joinFormUrl: 'https://forms.example/view' },
    fetchImpl: async url => {
      if (url.startsWith('https://forms.example/')) throw new Error('FORM_PRIVATE_ERROR');
      return url.endsWith('/health.json') ? version() : page();
    },
  });
  assert.equal(report.status, 'healthy');
  assert.equal(report.checks.filter(check => check.kind === 'form').length, 2);
  assert.ok(report.checks.filter(check => check.kind === 'form').every(check => check.access === 'unknown'));
  assert.equal(JSON.stringify(report).includes('FORM_PRIVATE_ERROR'), false);
});

test('a forbidden form is informational but is not mislabeled as the known sign-in baseline', async () => {
  const report = await run({ config: { ...config, formKeys: ['intakeFormUrl'] }, siteData: { intakeFormUrl: 'https://forms.example/view' },
    fetchImpl: async url => url.startsWith('https://forms.example/') ? new Response(null, { status: 403 })
      : url.endsWith('/health.json') ? version() : page(),
  });
  assert.equal(report.status, 'healthy');
  assert.equal(report.checks.find(check => check.kind === 'form').access, 'unavailable');
});

test('malformed configuration entries and an unexpected base path return an unknown report', async () => {
  for (const overrides of [
    { config: { ...config, pages: [null] } },
    { config: { ...config, formKeys: [null] } },
    { baseUrl: 'https://club.example/unexpected-path' },
  ]) {
    const report = await run(overrides);
    assert.equal(report.status, 'unknown');
    assert.equal(report.checks[0].code, 'invalid-configuration');
  }
});

test('Markdown reports state unknown evidence and distinguish informational form access', async () => {
  const { renderMarkdown } = await core();
  assert.equal(typeof renderMarkdown, 'function');
  const report = await run({ expectedSha: '' });
  const markdown = renderMarkdown(report);
  assert.match(markdown, /unknown/i);
  assert.match(markdown, /not observed/i);
  assert.match(markdown, /invalid-configuration/);
  assert.match(markdown, /informational/i);
});

async function fixture(t, handler) {
  const directory = await mkdtemp(join(tmpdir(), 'civic-monitor-test-'));
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, 'monitoring'));
  await mkdir(join(directory, 'src/data'), { recursive: true });
  await writeFile(join(directory, 'monitoring/site.json'), JSON.stringify(config));
  await writeFile(join(directory, 'src/data/site.json'), '{}');
  return { directory, base: `http://127.0.0.1:${server.address().port}` };
}

async function cli(directory, base, extra = []) {
  const script = fileURLToPath(new URL('../scripts/monitor-site.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, '--base', base, '--expected-sha', sha, '--output', 'reports', '--retry-delay-ms', '0', ...extra], { cwd: directory });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

test('CLI probes a real HTTP server and writes machine and readable reports from the default config', async t => {
  const methods = [];
  const { directory, base } = await fixture(t, (request, response) => {
    methods.push(request.method);
    response.setHeader('Content-Type', request.url === '/health.json' ? 'application/json' : 'text/html');
    response.end(request.url === '/health.json'
      ? JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: sha })
      : '<html><title>Civic AI Club</title><p>NEVER_SAVE_THIS_BODY</p></html>');
  });
  const result = await cli(directory, base);
  assert.equal(result.code, 0, result.stderr);
  const json = await readFile(join(directory, 'reports/health.json'), 'utf8');
  const markdown = await readFile(join(directory, 'reports/health.md'), 'utf8');
  const report = JSON.parse(json);
  assert.equal(report.status, 'healthy');
  assert.equal(report.expectedRevision, sha);
  assert.equal(report.observedRevision, sha);
  assert.match(markdown, /healthy/i);
  assert.ok(methods.length >= 2 && methods.every(method => method === 'GET'));
  assert.equal((json + markdown + result.stdout).includes('NEVER_SAVE_THIS_BODY'), false);
});

for (const [name, status, body, expected] of [
  ['missing version', 404, 'Not found', 'unknown'],
  ['stale version', 200, JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: 'b'.repeat(40) }), 'unhealthy'],
]) {
  test(`CLI returns failure and still writes both reports for ${name}`, async t => {
    let versionRequests = 0;
    const { directory, base } = await fixture(t, (request, response) => {
      if (request.url === '/health.json') {
        versionRequests++;
        response.writeHead(status, { 'content-type': 'application/json' });
        response.end(body);
      } else {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('<html>Civic AI Club</html>');
      }
    });
    const result = await cli(directory, base);
    assert.equal(result.code, 1);
    assert.equal(versionRequests, 2);
    assert.equal(JSON.parse(await readFile(join(directory, 'reports/health.json'), 'utf8')).status, expected);
    assert.match(await readFile(join(directory, 'reports/health.md'), 'utf8'), new RegExp(expected));
  });
}

test('real redirects are never followed to another origin', async t => {
  let foreignRequests = 0;
  const foreign = await fixture(t, (_request, response) => { foreignRequests++; response.end('Civic AI Club'); });
  const local = await fixture(t, (request, response) => {
    if (request.url === '/health.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ schemaVersion: 1, service: 'civicaiclub-site', sourceRevision: sha }));
    } else {
      response.writeHead(302, { location: foreign.base });
      response.end();
    }
  });
  const result = await cli(local.directory, local.base);
  assert.equal(result.code, 1);
  assert.equal(foreignRequests, 0);
  const report = JSON.parse(await readFile(join(local.directory, 'reports/health.json'), 'utf8'));
  assert.equal(report.checks.find(check => check.kind === 'page').code, 'cross-origin-redirect');
});
