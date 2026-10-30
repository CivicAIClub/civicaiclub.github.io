// Static release identity, not a claim of client acceptance or complete runtime health.
// Only public commit metadata is exposed; no settings, tokens or student data.
import { execFileSync } from 'node:child_process';
import type { APIRoute } from 'astro';

const sourceRevision = process.env.GITHUB_SHA
  || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceRevision)) {
  throw new Error('A full Git commit SHA is required for the website release identity.');
}

export const prerender = true;
export const GET: APIRoute = () => new Response(JSON.stringify({
  schemaVersion: 1,
  service: 'civicaiclub-site',
  sourceRevision,
  builtAt: new Date().toISOString(),
}), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
