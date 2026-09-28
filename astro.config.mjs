// astro.config.mjs: the main settings file for the site.
//
// Astro (the tool that builds this site) reads this file first. It says:
//   - where the finished site will live on the internet (so links in share previews are right),
//   - that every page is built ahead of time into plain files ("static"), which is what
//     GitHub Pages can host,
//   - that a page starts loading in the background when you hover a link to it ("prefetch"),
//     so clicking feels instant,
//   - which fonts to download and bundle with the site.
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  // The site's public address. There is no "base" path because this is the club's main
  // GitHub Pages site (civicaiclub.github.io), not a project sub-folder.
  site: 'https://civicaiclub.github.io',
  output: 'static',

  // Start fetching a page as soon as someone hovers (or focuses) a link to it.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  // Fonts: Astro downloads these from Fontsource (a free font library) while it builds the
  // site, stores them with the site's files, and writes the CSS for us. Both fonts are free
  // under the SIL Open Font License.
  //   - Host Grotesk: the main typeface. Weight 300 (Light) for large type and body text,
  //     400 (Regular) for small interface text like the header links.
  //   - Martian Mono: the small all-caps labels, counters and buttons.
  // "fallbacks" is the font shown for a split second before ours arrives. Because the last
  // one is a generic family ("sans-serif", "monospace"), Astro also adjusts that stand-in
  // font's size to match ours, so the text does not jump when the real font loads.
  // Vite (the tool Astro builds with) normally copies images used in CSS into their own files.
  // The paper grain (src/assets/texture/grain.png, about 8 KB) is written straight into the style
  // file instead, as text (a "data: address"). It covers every section, so phones would otherwise
  // wait for one more download before the page counts as drawn, which Google measures ("LCP").
  // Every other image keeps Vite's normal rule (only files under 4 KB are written in).
  vite: {
    build: {
      assetsInlineLimit: (filePath) => (filePath.endsWith('/texture/grain.png') ? true : undefined),
    },
  },

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Host Grotesk',
      cssVariable: '--font-host-grotesk',
      weights: [300, 400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Martian Mono',
      cssVariable: '--font-martian-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
});
