// cases.ts: one place to fetch the club's cases in the right order.
//
// The cases live as Markdown files in src/content/cases/ (checked by src/content.config.ts).
// Pages call these helpers instead of repeating the same sorting and filtering everywhere.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Case = CollectionEntry<'cases'>;

// Every case, A to E, in the order set by each file's "order" field.
export async function getAllCases(): Promise<Case[]> {
  const cases = await getCollection('cases');
  return cases.sort((a, b) => a.data.order - b.data.order);
}

// Only the cases that get their own page (public: true). Case E is listed on the home page but
// has no page yet.
export async function getPublicCases(): Promise<Case[]> {
  return (await getAllCases()).filter((c) => c.data.public);
}

// The case that comes after this one, for the "Next case" band at the bottom of a case page.
// After the last public case it wraps around to the first.
export async function getNextCase(slug: string): Promise<Case | undefined> {
  const list = await getPublicCases();
  const index = list.findIndex((c) => c.data.slug === slug);
  if (index === -1 || list.length < 2) return undefined;
  return list[(index + 1) % list.length];
}

// The address of a case page.
export function caseUrl(slug: string): string {
  return `/cases/${slug}/`;
}
