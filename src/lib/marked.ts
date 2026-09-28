// marked.ts: reads the one "marked" phrase out of a sentence.
//
// In a case file, the chore sentence marks one phrase with square brackets, like
//   "Study-hall staff spent [hours each week] logging into ..."
// The page shows that phrase with the crimson marker behind it (motion M5).
// This helper splits the sentence into three parts: the text before the brackets, the marked
// phrase, and the text after. If there are no brackets, everything is "before".
// Used by: src/components/MarkedText.astro.

export interface MarkedParts {
  before: string;
  mark: string;
  after: string;
}

export function splitMarked(text: string): MarkedParts {
  const match = text.match(/^([\s\S]*?)\[([^\]]+)\]([\s\S]*)$/);
  if (!match) return { before: text, mark: '', after: '' };
  return { before: match[1] ?? '', mark: match[2] ?? '', after: match[3] ?? '' };
}

// The same sentence with the brackets removed, for places that can't show a marker
// (page descriptions, share previews).
export function stripMarks(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, '$1');
}
