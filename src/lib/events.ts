// events.ts: one place to fetch the club's events, and to print their dates and speakers.
//
// Each event is a Markdown file in src/content/events/ (its rules are in src/content.config.ts).
// The events pages (src/pages/events/), the home page's "Latest event" teaser and the sitemap all
// ask this file for the list instead of sorting and filtering it themselves, so every page agrees
// on which events are public and which one is the latest.
// It also checks, while the site builds, that every photo an event asks for really exists in
// src/data/media.json, so a typo in a photo id stops the build with a clear message.
import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from './media';
import { formatPerson, joinNames, type Person } from './people';

export type EventEntry = CollectionEntry<'events'>;

// Every event marked "public: true", newest date first. Two events on the same day are sorted by
// their "order" field (1 first). Each one's photos are checked on the way (see checkEventMedia).
export async function getPublicEvents(): Promise<EventEntry[]> {
  const all = await getCollection('events');
  const list = all.filter((entry) => entry.data.public);
  list.forEach(checkEventMedia);
  // The dates are written "2026-05-17", so comparing them as text also compares them in time.
  return list.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.data.order - b.data.order);
}

// The newest public event (or undefined when there is none yet). The home page teaser and the top
// of /events/ use it.
export async function getLatestEvent(): Promise<EventEntry | undefined> {
  return (await getPublicEvents())[0];
}

// The address of an event's page, e.g. "/events/ai-literacy-week/".
export function eventUrl(slug: string): string {
  return `/events/${slug}/`;
}

// Turn "2026-05-17" into a JavaScript date at noon, in the "UTC" world clock. Printing it in that
// same clock (timeZone: 'UTC' below) means the day can never slip to May 16 or May 18, whatever
// time zone the computer that builds the site is in.
function toDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

// Print an event's date in one of three ways:
//   'long'  → "Sunday, May 17, 2026" (the default)
//   'short' → "May 17"
//   'month' → "May 2026"
export function formatEventDate(iso: string, style: 'long' | 'short' | 'month' = 'long'): string {
  const options: Record<typeof style, Intl.DateTimeFormatOptions> = {
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    short: { month: 'short', day: 'numeric' },
    month: { month: 'long', year: 'numeric' },
  };
  return toDate(iso).toLocaleDateString('en-US', { ...options[style], timeZone: 'UTC' });
}

// The weekday and the day without the year, e.g. "Sunday, May 17" (the program's heading uses it).
export function formatEventDay(iso: string): string {
  return toDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// A speaker as the program prints them: the name with its class year, then the role if there is
// one. For example { name: "Jay Youm", classYear: 2026, role: "alumni advisor" } becomes
// "Jay Youm ’26, alumni advisor".
export function formatSpeaker(p: Person): string {
  return formatPerson(p) + (p.role ? `, ${p.role}` : '');
}

// The "With …" line printed under a photo's caption, from the photo's "people" list in the event
// file: "With Luke Ryan ’27." or "With Luke Ryan ’27 and Jay Youm ’26.". An empty list (every
// photo today, until names are confirmed) gives back an empty string, and nothing is printed.
export function withPeople(people: Person[] = []): string {
  return people.length ? `With ${joinNames(people.map(formatPerson))}.` : '';
}

// Every photo id one event asks for: the cover, the home card and the /events/ frame, the demo
// sheet's two photos, each chapter's photos and the closing photo (the main id and the phone crop
// of each).
function photoIds(entry: EventEntry): string[] {
  const data = entry.data;
  const plates = [
    data.cover,
    data.card,
    data.feature,
    ...data.program.flatMap((chapter) => [chapter.sheet?.before, chapter.sheet?.after, ...chapter.plates]),
    data.closing,
  ];
  // (The home card has no phone crop, so "phone" is only read where a photo can have one.)
  return plates
    .flatMap((plate) => (plate ? [plate.media, 'phone' in plate ? plate.phone : undefined] : []))
    .filter((id): id is string => Boolean(id));
}

// Stop the build, naming the file and the id, if an event asks for a photo that isn't listed in
// src/data/media.json as a photo ("kind": "image"). Better to find out on your own computer than
// to publish a page with an empty frame.
export function checkEventMedia(entry: EventEntry): void {
  for (const id of photoIds(entry)) {
    if (!getImage(id)) {
      throw new Error(`events/${entry.data.slug}.md: "${id}" is not a photo in src/data/media.json`);
    }
  }
}
