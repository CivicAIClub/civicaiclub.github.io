// sitemap.xml.ts: builds /sitemap.xml, the list of pages search engines should know about.
//
// It lists the home page, the events list and every public event page, About, the one-page
// project spec, and every public case page. The style guide and the 404 page are left out on purpose (the style guide is a tool
// for the club, not a page for visitors).
import type { APIRoute } from 'astro';
import { getPublicCases, caseUrl } from '../lib/cases';
import { getPublicEvents, eventUrl } from '../lib/events';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://civicaiclub.github.io');
  const cases = await getPublicCases();
  const events = await getPublicEvents();
  const paths = [
    '/',
    '/events/',
    ...events.map((entry) => eventUrl(entry.data.slug)),
    '/about/',
    '/spec/',
    ...cases.map((entry) => caseUrl(entry.data.slug)),
  ];
  const urls = paths.map((path) => `  <url><loc>${new URL(path, base).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
