import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../scripts/monitor-browser.mjs', import.meta.url));
const chromePath = process.env.CHROME_PATH || (
  existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined
);
const config = {
  schemaVersion: 1,
  pages: [
    { path: '/', contains: ['Civic AI Club', 'id="main"'] },
    { path: '/about/', contains: ['About'] },
    { path: '/events/', contains: ['Events'] },
  ],
};

async function fixture(t, { brokenNavigation = false, hiddenHeading = false, missingEvents = false,
  mutating = false, externalNavigation = false, sameDocumentNavigation = false, headingBelowFold = false, footerTrap = false } = {}) {
  let mutations = 0;
  const server = createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      mutations += 1;
      res.writeHead(204).end();
      return;
    }
    const heading = { '/': 'Civic AI Club', '/about/': 'About', '/events/': 'Events' }[req.url];
    if (!heading) { res.writeHead(404).end('missing'); return; }
    res.writeHead(missingEvents && req.url === '/events/' ? 404 : 200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><html><head><title>${heading}</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{margin:24px;font:18px sans-serif}h1{font-size:48px}
      [data-menu-toggle]{display:none}@media(max-width:767px){html.js nav[aria-label="Main"]{display:none}html.js [data-menu-toggle]{display:block}}
      ${hiddenHeading ? 'h1{opacity:0}' : ''}${headingBelowFold ? 'main{padding-top:1200px}' : ''}</style></head><body>
      <header><nav aria-label="Main"><a href="/about/">About</a> <a href="/events/">Events</a></nav>
      <button data-menu-toggle aria-expanded="false" onclick="this.setAttribute('aria-expanded','true');document.querySelector('[data-menu]').hidden=false">Menu</button>
      <nav data-menu hidden aria-label="Menu"><a href="/about/">About</a> <a href="/events/">Events</a></nav></header>
      ${externalNavigation ? '<iframe title="Unexpected external page" src="https://example.invalid/private-form"></iframe>' : ''}
      <main id="main"><h1>${heading}</h1><p>Public information and useful community work.</p>
      <a href="https://example.invalid/private-form">External form</a></main>
      ${footerTrap ? '<footer style="position:fixed;top:300px;left:24px"><a data-footer-link href="/events/">Events</a></footer><div aria-hidden="true" style="position:fixed;top:280px;left:0;width:200px;height:100px;z-index:2"></div>' : ''}
      <script>document.documentElement.classList.add('js');
      ${mutating ? "fetch('/must-not-mutate', {method:'POST',body:'PRIVATE_BODY_SENTINEL'}).catch(()=>{});" : ''}
      ${brokenNavigation ? "document.querySelectorAll('a[href=\"/about/\"]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));" : ''}
      ${sameDocumentNavigation ? "document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();history.pushState({},'',a.href);document.querySelector('h1').textContent=a.textContent;document.title=a.textContent;}));" : ''}
      ${footerTrap ? "document.querySelector('[data-footer-link]').addEventListener('click',e=>e.preventDefault());" : ''}
      </script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const output = await mkdtemp(join(tmpdir(), 'civic-browser-test-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  return { base: `http://127.0.0.1:${server.address().port}`, output, mutations: () => mutations };
}

async function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, ...args], {
      env: { ...process.env, ...(chromePath ? { CHROME_PATH: chromePath } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
}

test('CLI checks real pages in desktop/mobile and both motion modes, without submitting requests or storing page bodies', async t => {
  const site = await fixture(t);
  const configPath = join(site.output, 'config.json');
  await writeFile(configPath, JSON.stringify(config));
  const result = await runCli(['--base', site.base, '--output', site.output, '--config', configPath]);
  assert.equal(result.code, 0, result.output);
  const raw = await readFile(join(site.output, 'browser.json'), 'utf8');
  const report = JSON.parse(raw);
  assert.equal(report.status, 'passed');
  assert.ok(Number.isFinite(Date.parse(report.checkedAt)));
  assert.ok(report.durationMs >= 0);
  for (const viewport of ['desktop', 'mobile']) {
    for (const motion of ['normal', 'reduced']) {
      assert.ok(report.checks.some(check => check.viewport.name === viewport && check.motion === motion && check.type === 'navigation' && check.status === 'passed'));
    }
  }
  assert.equal(site.mutations(), 0, 'browser must abort POST before it reaches the server');
  assert.equal(report.blockedRequests.mutating, 0);
  assert.ok(!raw.includes('PRIVATE_BODY_SENTINEL'));
  assert.ok(!raw.includes('Public information and useful community work'));
});

test('an attempted mutation is blocked before reaching the server and fails the safety check', async t => {
  const site = await fixture(t, { mutating: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(site.mutations(), 0);
  assert.equal(report.status, 'failed');
  assert.ok(report.blockedRequests.mutating > 0);
  assert.ok(report.checks.some(check => check.type === 'safety' && check.status === 'failed'));
  assert.ok(!(await readFile(join(site.output, 'browser.json'), 'utf8')).includes('PRIVATE_BODY_SENTINEL'));
});

test('unexpected external navigation fails the safety check without following the external form', async t => {
  const site = await fixture(t, { externalNavigation: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(report.status, 'failed');
  assert.ok(report.blockedRequests.externalNavigation > 0);
  assert.ok(report.checks.some(check => check.type === 'safety' && check.status === 'failed'));
  assert.ok(!(await readFile(join(site.output, 'browser.json'), 'utf8')).includes('example.invalid/private-form'));
});

test('a URL-only client transition cannot pass without an observed navigation response', async t => {
  const site = await fixture(t, { sameDocumentNavigation: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.type === 'navigation' && check.code === 'navigation_response_missing'));
});

test('successful direct page loads do not hide a broken real navigation link', async t => {
  const site = await fixture(t, { brokenNavigation: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.type === 'page' && check.status === 'passed'));
  assert.ok(report.checks.some(check => check.type === 'navigation' && check.status === 'failed'));
  assert.equal(JSON.parse(await readFile(join(site.output, 'browser.json'), 'utf8')).status, 'failed');
});

test('a visually hidden heading fails even when the expected text exists in the DOM', async t => {
  const site = await fixture(t, { hiddenHeading: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config: { schemaVersion: 1, pages: [config.pages[0]] }, executablePath: chromePath, timeoutMs: 500 });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.code === 'heading_not_readable'));
});

test('a clicked internal link returning readable HTML with HTTP 404 fails navigation', async t => {
  const site = await fixture(t, { missingEvents: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config: { schemaVersion: 1, pages: [{ path: '/' }] }, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.type === 'navigation' && check.code === 'http_status' && check.httpStatus === 404));
});

test('a critical missing page exits nonzero and still saves the failure report', async t => {
  const site = await fixture(t);
  const configPath = join(site.output, 'missing.json');
  await writeFile(configPath, JSON.stringify({ schemaVersion: 1, pages: [{ path: '/missing/' }] }));
  const result = await runCli(['--base', site.base, '--output', site.output, '--config', configPath]);
  assert.equal(result.code, 1);
  const report = JSON.parse(await readFile(join(site.output, 'browser.json'), 'utf8'));
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.code === 'http_status' && check.httpStatus === 404));
});

test('credential-bearing bases are rejected without leaking credentials in the report', async t => {
  const site = await fixture(t);
  const result = await runCli(['--base', site.base.replace('http://', 'http://user:PRIVATE_CREDENTIAL@'), '--output', site.output]);
  assert.equal(result.code, 1);
  const raw = await readFile(join(site.output, 'browser.json'), 'utf8');
  assert.equal(JSON.parse(raw).status, 'failed');
  assert.ok(!raw.includes('PRIVATE_CREDENTIAL'));
});

test('the whole-run deadline stops remaining checks and preserves an explicit partial failure report', async t => {
  const site = await fixture(t);
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700, maxDurationMs: 10 });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.type === 'budget' && check.code === 'run_budget_exceeded'));
  assert.ok(report.checks.filter(check => check.type === 'page').length < 18);
  assert.ok(report.durationMs < 10000, 'a small deadline must not run the whole matrix');
  assert.equal(JSON.parse(await readFile(join(site.output, 'browser.json'), 'utf8')).status, 'failed');
});

test('readable content below the fold is reached by a legitimate scroll', async t => {
  const site = await fixture(t, { headingBelowFold: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config: { schemaVersion: 1, pages: [{ path: '/' }] }, executablePath: chromePath, timeoutMs: 500 });
  assert.equal(report.status, 'passed');
});

test('mobile navigation opens the header menu instead of choosing a covered footer link', async t => {
  const site = await fixture(t, { footerTrap: true });
  const { runBrowserMonitor } = await import('../scripts/monitor-browser.mjs');
  const report = await runBrowserMonitor({ ...site, config, executablePath: chromePath, timeoutMs: 700 });
  assert.equal(report.status, 'passed');
});
