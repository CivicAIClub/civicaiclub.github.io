#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { monitorSite, renderMarkdown } from './monitor/core.mjs';

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return null; }
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    base: { type: 'string' },
    'expected-sha': { type: 'string' },
    output: { type: 'string', default: 'monitor-output' },
    config: { type: 'string', default: 'monitoring/site.json' },
    'site-data': { type: 'string', default: 'src/data/site.json' },
    'timeout-ms': { type: 'string', default: '8000' },
    'retry-delay-ms': { type: 'string', default: '1000' },
  }, strict: true, allowPositionals: false });
  const [config, siteData] = await Promise.all([readJson(values.config), readJson(values['site-data'])]);
  const report = await monitorSite({ baseUrl: values.base, expectedSha: values['expected-sha'], config, siteData,
    timeoutMs: Number(values['timeout-ms']), retryDelayMs: Number(values['retry-delay-ms']) });
  const output = resolve(values.output);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'health.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(output, 'health.md'), renderMarkdown(report));
  console.log(`Site health: ${report.status}. Reports written to ${output}`);
  return report.status === 'healthy' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    // Do not leak paths, URLs or server messages from an unexpected exception.
    console.error('Monitor could not complete. Check its arguments and report-directory access.');
    process.exitCode = 1;
  });
}
