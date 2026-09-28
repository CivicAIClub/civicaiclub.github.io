// media.ts: looks up a video clip by its id in the media list.
//
// Every video on the site is listed once in src/data/media.json (the "manifest"): its id,
// its files, its size in pixels, its length and its written caption. Components never type
// file paths; they ask for a clip by id, for example <Video id="autoplanner-hero" />.
// This file reads that list, checks every entry is complete (so a typo fails the build with a
// clear message instead of showing a broken video), and hands entries to src/components/Video.astro.
//
// The full list of ids the pages expect is in MEDIA-IDS.md at the top of the project.
// src/data/media-demo.json holds one small test clip used only by the /styleguide/ page.
import { z } from 'astro/zod';
import rawMedia from '../data/media.json';
import rawDemo from '../data/media-demo.json';

// A file path inside public/media/, e.g. "/media/autoplanner/autoplanner-hero.av1.mp4".
const mediaPath = (ending: RegExp, what: string) =>
  z.string().regex(ending, `${what} must be a path like /media/<slug>/<file> ending in ${ending.source}`);

// A smaller copy of the clip for phones (optional). Same rules as the main files.
const mobileSchema = z.object({
  av1: mediaPath(/^\/media\/.+\.av1\.mp4$/, 'mobile.av1'),
  h264: mediaPath(/^\/media\/.+\.h264\.mp4$/, 'mobile.h264'),
  // The phone copy's own still (its first frame), when it is framed differently from the main
  // clip. src/scripts/motion/modules/video.js swaps it in on phones so nothing jumps at play.
  poster: mediaPath(/^\/media\/.+\.webp$/, 'mobile.poster').optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// The rules for one clip. The comments on each line say what the field is for.
export const clipSchema = z
  .object({
    // The name pages use to ask for this clip, e.g. "autoplanner-hero".
    id: z.string().regex(/^[a-z0-9-]+$/, 'id: lowercase letters, numbers and dashes only'),
    // Which case (by slug) or page ("home", "about", "styleguide") the clip belongs to.
    case: z.string().optional(),
    // Pages that show it. The media check adds up the home page's video weight from this.
    usedOn: z.array(z.string()).default([]),
    // The AV1 file (small, modern browsers) and the H.264 file (plays everywhere). Scrub clips
    // may leave out AV1: they are encoded with a keyframe on every frame for smooth seeking,
    // which H.264 handles best.
    av1: mediaPath(/^\/media\/.+\.av1\.mp4$/, 'av1').optional(),
    h264: mediaPath(/^\/media\/.+\.h264\.mp4$/, 'h264'),
    // A still picture shown before the video plays (and instead of it when playback is blocked).
    poster: mediaPath(/^\/media\/.+\.webp$/, 'poster'),
    // Size in pixels and length in seconds, so the page can reserve the right space.
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    duration: z.number().positive(),
    // What the clip shows, in words, for people who can't see it.
    caption: z.string().min(1),
    // True when the clip shows invented example data (every tool recording does).
    demoData: z.boolean().default(true),
    // True for the "scroll is the playhead" clips, which are encoded with a keyframe on every
    // frame so they can be scrubbed smoothly. They never autoplay.
    scrub: z.boolean().default(false),
    mobile: mobileSchema.optional(),
  })
  // Every clip that plays as a loop needs its small AV1 file too.
  .refine((clip) => clip.scrub || Boolean(clip.av1), {
    message: 'av1 is required (only scrub clips may leave it out)',
    path: ['av1'],
  })
  // A tool recording must say so in its caption.
  .refine((clip) => !clip.demoData || /Demo data\.$/.test(clip.caption.trim()), {
    message: 'caption must end with "Demo data." when demoData is true',
    path: ['caption'],
  });

export type Clip = z.infer<typeof clipSchema>;

// A photo (not a video), marked "kind": "image" in media.json, e.g. the club photo on About.
// It lists one file per format and width under "files" (for example files.webp["1600"]), so a
// page can offer the browser several sizes. Extra fields are kept for the page to use.
export const imageSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id: lowercase letters, numbers and dashes only'),
    kind: z.literal('image'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    // What the photo shows, for people who can't see it.
    alt: z.string().min(1),
    caption: z.string().optional(),
    files: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export type MediaImage = z.infer<typeof imageSchema>;

// Check both lists once, when the site builds. Any mistake stops the build and names the field.
// Photos ("kind": "image") are checked with their own rules; everything else is a video clip.
const isImage = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && (entry as { kind?: unknown }).kind === 'image';
const rawEntries: unknown[] = [...(rawMedia as unknown[]), ...(rawDemo as unknown[])];
const clips: Clip[] = z.array(clipSchema).parse(rawEntries.filter((entry) => !isImage(entry)));
const images: MediaImage[] = z.array(imageSchema).parse(rawEntries.filter(isImage));

// Two entries with the same id would be confusing, so that is an error too.
const byId = new Map<string, Clip>();
const imagesById = new Map<string, MediaImage>();
for (const entry of [...clips, ...images]) {
  if (byId.has(entry.id) || imagesById.has(entry.id)) {
    throw new Error(`media.json: the id "${entry.id}" is listed twice.`);
  }
  if ('kind' in entry && entry.kind === 'image') imagesById.set(entry.id, entry as MediaImage);
  else byId.set(entry.id, entry as Clip);
}

// Find a photo by id (or undefined when it is not listed).
export function getImage(id: string | undefined): MediaImage | undefined {
  return id ? imagesById.get(id) : undefined;
}

// Find a clip by id. Gives back undefined when it is not listed yet, so the page can show a
// placeholder instead of a broken video.
export function getClip(id: string | undefined): Clip | undefined {
  return id ? byId.get(id) : undefined;
}

// Every clip, for pages or scripts that need the whole list.
export function allClips(): Clip[] {
  return [...byId.values()];
}
