// Read-only browser smoke checks. Reports contain outcomes, never captured page bodies.
import { chromium } from 'playwright-core';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const setups = ['desktop', 'mobile'].flatMap(name => {
  const viewport = name === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  return [
    { viewport: { name, ...viewport }, motion: 'normal', javaScriptEnabled: true },
    { viewport: { name, ...viewport }, motion: 'reduced', javaScriptEnabled: true },
    { viewport: { name, ...viewport }, motion: 'reduced', javaScriptEnabled: false },
  ];
});

class CheckFailure extends Error {
  constructor(code, details = {}) { super(code); this.code = code; this.details = details; }
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    return url.href;
  } catch { return null; }
}

function pathKey(value) { return new URL(value).pathname.replace(/\/+$/, '') || '/'; }

function validate(base, config) {
  let url;
  try { url = new URL(base); } catch { throw new CheckFailure('invalid_base'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new CheckFailure('invalid_base');
  }
  if (config.schemaVersion !== 1 || !Array.isArray(config.pages) || !config.pages.length) {
    throw new CheckFailure('invalid_config');
  }
  for (const page of config.pages) {
    if (!page || typeof page.path !== 'string' || !page.path.startsWith('/') || page.path.startsWith('//')) {
      throw new CheckFailure('invalid_config');
    }
    const target = new URL(page.path, url);
    if (target.origin !== url.origin || target.search || target.hash ||
        (page.contains !== undefined && (!Array.isArray(page.contains) || page.contains.some(value => typeof value !== 'string' || !value.trim())))) {
      throw new CheckFailure('invalid_config');
    }
  }
  return url;
}

async function loadConfig(path, explicit) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (!explicit && error.code === 'ENOENT') return { schemaVersion: 1, pages: [{ path: '/', contains: ['Civic AI Club'] }] };
    throw new CheckFailure('invalid_config');
  }
}

async function checkReadable(page, contract, timeoutMs) {
  const started = performance.now();
  try {
    // Readability does not require every valid page heading to begin above the fold.
    await page.locator('main h1, main h2').first().scrollIntoViewIfNeeded({ timeout: timeoutMs });
    await page.waitForFunction(() => {
      const visible = element => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2 || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return false;
        for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) return false;
        }
        return true;
      };
      const main = document.querySelector('main');
      if (!visible(main)) return false;
      return [...main.querySelectorAll('h1, h2')].some(heading => {
        if (!visible(heading)) return false;
        // SVG wordmarks and ordinary text headings are both supported.
        if ([...heading.querySelectorAll('svg[aria-label], img[alt]')].some(visible)) return true;
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.trim() && visible(walker.currentNode.parentElement)) return true;
        }
        return false;
      });
    }, undefined, { polling: 100, timeout: Math.max(1, timeoutMs - (performance.now() - started)) });
  } catch { throw new CheckFailure('heading_not_readable'); }

  const content = await page.evaluate(() => ({
    title: document.title.trim(),
    text: document.body.innerText + ' ' + [...document.querySelectorAll('main [aria-label], main img[alt]')]
      .map(element => element.getAttribute('aria-label') || element.getAttribute('alt') || '').join(' '),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 8,
  }));
  if (!content.title) throw new CheckFailure('missing_title');
  if (content.overflow) throw new CheckFailure('horizontal_overflow');
  const normalize = value => value.replace(/\s+/g, ' ').toLowerCase();
  // The shared HTTP contract can include HTML markers; inspect them in memory only.
  const documentContent = normalize(content.text + ' ' + await page.content());
  if ((contract?.contains || []).some(value => !documentContent.includes(normalize(value)))) {
    throw new CheckFailure('content_contract');
  }
}

async function goTo(page, target, timeoutMs) {
  let response;
  try { response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: timeoutMs }); }
  catch { throw new CheckFailure('navigation_failed'); }
  if (!response || response.status() >= 400) throw new CheckFailure('http_status', { httpStatus: response?.status() ?? null });
  if (pathKey(page.url()) !== pathKey(target)) throw new CheckFailure('unexpected_destination');
}

async function navigationTargets(page, base, pages) {
  const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.href));
  const allowed = new Set(pages.map(page => pathKey(new URL(page.path, base))));
  const candidates = [...new Set(links)].filter(value => {
    const url = new URL(value);
    return url.origin === base.origin && !url.search && !url.username && !url.password &&
      pathKey(url) !== '/' && (allowed.has(pathKey(url)) || /^\/(about|events|cases)(\/|$)/.test(url.pathname));
  });
  const about = candidates.find(value => pathKey(value) === '/about');
  const next = candidates.find(value => pathKey(value) === '/events') || candidates.find(value => /^\/cases\/.+/.test(new URL(value).pathname));
  const chosen = [...new Set([about, next, ...candidates].filter(Boolean))].slice(0, 2);
  if (chosen.length !== 2) throw new CheckFailure('navigation_targets_missing');
  return chosen;
}

async function visibleLink(page, target, menuOnly = false) {
  // Prefer the actual navigation. isVisible alone also includes distant footer
  // links, whose automatic scroll can fight the site's smooth-scroll controls.
  for (const scope of menuOnly ? ['[data-menu] a[href]'] : ['header a[href]', 'a[href]']) {
    for (const link of await page.locator(scope).all()) {
      const href = await link.getAttribute('href');
      if (href && pathKey(new URL(href, page.url())) === pathKey(target) && await link.isVisible()) {
        const url = new URL(href, page.url());
        if (url.origin !== new URL(target).origin || url.search) continue;
        if (scope === 'a[href]') {
          const rect = await link.boundingBox();
          const viewport = page.viewportSize();
          if (!rect || rect.y + rect.height <= 0 || rect.y >= viewport.height || rect.x + rect.width <= 0 || rect.x >= viewport.width) continue;
        }
        return link;
      }
    }
  }
  return null;
}

async function followLink(page, target, timeoutMs) {
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const activate = locator => touch ? locator.tap({ timeout: timeoutMs }) : locator.click({ timeout: timeoutMs });
  const menu = page.locator('[data-menu-toggle]').first();
  let link;
  // A transformed footer may look geometrically visible while the hero covers
  // it. On phones exercise the menu before considering any global links.
  if (await menu.count() && await menu.isVisible()) {
    if (await menu.getAttribute('aria-expanded') !== 'true') await activate(menu);
    if (await menu.getAttribute('aria-expanded') !== 'true') throw new CheckFailure('menu_not_open');
    link = await visibleLink(page, target, true);
  } else link = await visibleLink(page, target);
  if (!link) throw new CheckFailure('navigation_link_missing');
  let status;
  const responseStatus = response => {
    const request = response.request();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame() && pathKey(response.url()) === pathKey(target)) {
      status = response.status();
    }
  };
  page.on('response', responseStatus);
  try {
    await Promise.all([
      page.waitForURL(url => pathKey(url) === pathKey(target), { waitUntil: 'domcontentloaded', timeout: timeoutMs }),
      activate(link),
    ]);
  } catch { throw new CheckFailure('navigation_failed'); }
  finally { page.off('response', responseStatus); }
  if (status === undefined) throw new CheckFailure('navigation_response_missing');
  if (status < 200 || status >= 400) throw new CheckFailure('http_status', { httpStatus: status });
}

export async function runBrowserMonitor({ base, output, config, configPath = 'monitoring/site.json', explicitConfig = false,
  executablePath = process.env.CHROME_PATH, timeoutMs = 10000, maxDurationMs = 180000 }) {
  const started = performance.now();
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), base: safeUrl(base), status: 'passed', durationMs: 0,
    maxDurationMs, blockedRequests: { mutating: 0, externalNavigation: 0 }, checks: [] };
  let browser;
  let budgetRecorded = false;
  const expired = () => performance.now() - started >= maxDurationMs;
  const budgetFailure = setup => {
    if (!budgetRecorded) {
      budgetRecorded = true;
      report.status = 'failed';
      report.checks.push({ type: 'budget', url: report.base, viewport: setup?.viewport ?? null, motion: setup?.motion ?? null,
        javaScriptEnabled: setup?.javaScriptEnabled ?? null, status: 'failed', code: 'run_budget_exceeded', durationMs: 0 });
    }
    return new CheckFailure('run_budget_exceeded');
  };
  const assertBudget = setup => { if (expired()) throw budgetFailure(setup); };
  const save = async () => {
    report.durationMs = Math.round(performance.now() - started);
    await mkdir(output, { recursive: true });
    const temporary = join(output, 'browser.json.tmp');
    await writeFile(temporary, JSON.stringify(report, null, 2) + '\n');
    await rename(temporary, join(output, 'browser.json'));
  };
  const record = async (type, url, setup, check) => {
    if (!['runner', 'safety'].includes(type)) assertBudget(setup);
    const start = performance.now();
    const result = { type, url: safeUrl(url), viewport: setup?.viewport ?? null, motion: setup?.motion ?? null,
      javaScriptEnabled: setup?.javaScriptEnabled ?? null, status: 'passed', durationMs: 0 };
    try { await check(); }
    catch (error) {
      result.status = 'failed';
      result.code = error instanceof CheckFailure ? error.code : 'browser_check_failed';
      if (error instanceof CheckFailure) Object.assign(result, error.details);
      report.status = 'failed';
    }
    result.durationMs = Math.round(performance.now() - start);
    report.checks.push(result);
    await save();
    return result.status === 'passed';
  };
  try {
    if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs < 1 || maxDurationMs > 300000) throw new CheckFailure('invalid_budget');
    config ??= await loadConfig(configPath, explicitConfig);
    const baseUrl = validate(base, config);
    assertBudget();
    try { browser = await chromium.launch({ headless: true, timeout: Math.min(10000, maxDurationMs), ...(executablePath ? { executablePath } : {}) }); }
    catch { if (expired()) throw budgetFailure(); throw new CheckFailure('browser_unavailable'); }

    for (const setup of setups) {
      assertBudget(setup);
      const { name, ...viewport } = setup.viewport;
      const blockedBefore = { ...report.blockedRequests };
      const context = await browser.newContext({ viewport, isMobile: name === 'mobile', hasTouch: name === 'mobile',
        reducedMotion: setup.motion === 'reduced' ? 'reduce' : 'no-preference', javaScriptEnabled: setup.javaScriptEnabled,
        serviceWorkers: 'block' });
      try {
        await context.route('**/*', async route => {
          const request = route.request();
          if (expired()) { budgetFailure(setup); return route.abort('timedout'); }
          if (!['GET', 'HEAD'].includes(request.method())) {
            report.blockedRequests.mutating += 1;
            return route.abort('blockedbyclient');
          }
          if (request.isNavigationRequest() && new URL(request.url()).origin !== baseUrl.origin) {
            report.blockedRequests.externalNavigation += 1;
            return route.abort('blockedbyclient');
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(timeoutMs);
        let pageErrors = 0;
        page.on('pageerror', () => { pageErrors += 1; });
        for (const contract of config.pages) {
          const target = new URL(contract.path, baseUrl).href;
          await record('page', target, setup, async () => {
            pageErrors = 0;
            await goTo(page, target, timeoutMs);
            await checkReadable(page, contract, timeoutMs);
            if (pageErrors) throw new CheckFailure('javascript_error');
          });
        }

        let targets;
        const ready = await record('navigation_start', baseUrl.href, setup, async () => {
          await goTo(page, new URL('/', baseUrl).href, timeoutMs);
          await checkReadable(page, config.pages.find(contract => contract.path === '/'), timeoutMs);
          targets = await navigationTargets(page, baseUrl, config.pages);
        });
        if (ready) {
          for (const target of targets) {
            const passed = await record('navigation', target, setup, async () => {
              pageErrors = 0;
              await followLink(page, target, timeoutMs);
              await checkReadable(page, config.pages.find(contract => pathKey(new URL(contract.path, baseUrl)) === pathKey(target)), timeoutMs);
              if (pageErrors) throw new CheckFailure('javascript_error');
            });
            if (!passed) break;
          }
        }
      } finally {
        await context.close();
        await record('safety', baseUrl.href, setup, async () => {
          const blockedRequests = {
            mutating: report.blockedRequests.mutating - blockedBefore.mutating,
            externalNavigation: report.blockedRequests.externalNavigation - blockedBefore.externalNavigation,
          };
          if (blockedRequests.mutating || blockedRequests.externalNavigation) {
            throw new CheckFailure('unexpected_request', { blockedRequests });
          }
        });
      }
    }
  } catch (error) {
    if (error?.code !== 'run_budget_exceeded') await record('runner', base, null, async () => { throw error; });
  } finally {
    if (browser) await browser.close().catch(() => { report.status = 'failed'; });
    if (expired() && Number.isSafeInteger(maxDurationMs) && maxDurationMs >= 1 && maxDurationMs <= 300000) budgetFailure();
    await save();
  }
  return report;
}

async function main() {
  const options = { output: 'monitor-output' };
  const keys = { '--base': 'base', '--output': 'output', '--config': 'configPath', '--max-duration-ms': 'maxDurationMs' };
  let invalid = false;
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = keys[process.argv[i]];
    const value = process.argv[i + 1];
    if (!key || !value || value.startsWith('--')) { invalid = true; break; }
    options[key] = key === 'maxDurationMs' ? Number(value) : value;
    if (key === 'configPath') options.explicitConfig = true;
  }
  if (invalid) options.base = undefined;
  const report = await runBrowserMonitor(options);
  console.log(`Browser smoke: ${report.status}; ${report.checks.filter(check => check.status === 'failed').length} failed check(s).`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Browser smoke could not save its report.'); process.exitCode = 1; });
}
