// people.ts: small helpers for printing people's names the way the site shows them.
//
// The club asked for names with two-digit class years, written with a curly apostrophe:
// "Luke Ryan ’27". These helpers do that formatting in one place, and sort lists by last
// name, so every page prints names the same way.
// Used by: the case pages (credits), the About page (the full member roll), the footer.

// One person as stored in src/data/members.json or a case file's "team" list.
export interface Person {
  name: string;
  classYear?: number;
  role?: string;
}

// Turn a class year like 2027 into the short form ’27 (a curly right single quote, then the
// last two digits). Gives back an empty string when there is no class year (for example,
// the faculty advisor).
export function classYearShort(year?: number): string {
  if (!year) return '';
  return `’${String(year).slice(-2)}`;
}

// "Luke Ryan" + 2027 becomes "Luke Ryan ’27". A name without a year comes back unchanged.
// The space before the year is a "no-break space" (\u00a0), so a line never ends with the
// surname and starts the next line with a lone ’27.
export function formatPerson(person: Person): string {
  const year = classYearShort(person.classYear);
  return year ? `${person.name}\u00a0${year}` : person.name;
}

// The last word of a name, used for sorting ("Magnus Songhurst" sorts under S).
export function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

// Give back a new list sorted by last name, then first name, ignoring upper/lower case.
// The original list is left as it was.
export function sortByLastName<T extends Person>(people: readonly T[]): T[] {
  return [...people].sort(
    (a, b) =>
      lastName(a.name).localeCompare(lastName(b.name), 'en', { sensitivity: 'base' }) ||
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

// Join names for a sentence: "A", "A and B", "A, B and C".
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
