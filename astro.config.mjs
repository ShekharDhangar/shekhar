import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { remarkObsidianComments, remarkHighlights, rehypeCallouts } from './src/lib/markdown/obsidian';

export const FONT_VARIABLE = '--font-source-code-pro';

/**
 * Rehype plugin: lazy-load and async-decode every markdown image.
 * Zero dependencies — walks the hast tree directly. Existing attributes win,
 * so an explicit loading/decoding in the source is never overridden.
 */
function rehypeLazyImages() {
  const visit = node => {
    if (node.tagName === 'img') {
      node.properties = { loading: 'lazy', decoding: 'async', ...node.properties };
    }
    node.children?.forEach(visit);
  };
  return tree => visit(tree);
}

/**
 * Rehype plugin: opt a link into hover previews by giving it a `preview` title
 * in markdown — `[Obsidian](https://obsidian.md "preview")`. We move that to a
 * `data-preview` attribute (and drop the title so there's no native tooltip);
 * Layout.astro's script lazy-loads a screenshot on hover. Portable: other
 * renderers just show a normal link.
 */
function rehypeLinkPreview() {
  const visit = node => {
    if (node.tagName === 'a' && node.properties?.title === 'preview') {
      node.properties['data-preview'] = '';
      delete node.properties.title;
    }
    node.children?.forEach(visit);
  };
  return tree => visit(tree);
}

/**
 * Shiki transformer: decide per-block whether the copy button shows, and stamp
 * the answer onto the <pre> as `data-copy`. The client script in Layout.astro
 * just honors that attribute.
 *
 * Control it from the markdown fence's meta string (portable — every other
 * renderer ignores it, so cross-posting to Medium/Substack is unaffected):
 *   ```bash            → default: real languages get a copy button
 *   ```txt copy        → force a button on a plaintext tree/text block
 *   ```bash no-copy    → suppress the button on a command
 */
const NO_COPY_LANGS = ['plaintext', 'text', 'txt', 'ansi'];
function shikiCopyAttr() {
  return {
    name: 'copy-attr',
    pre(node) {
      const meta = (this.options.meta && this.options.meta.__raw) || '';
      const lang = this.options.lang || '';
      let copy;
      if (/\bno-?copy\b/.test(meta)) copy = false;
      else if (/\bcopy\b/.test(meta)) copy = true;
      else copy = !NO_COPY_LANGS.includes(lang);
      if (copy) node.properties['data-copy'] = 'true';
    },
  };
}

export default defineConfig({
  // Canonical production URL — used for the sitemap and JSON-LD `Astro.site`.
  // If the domain differs, this is the only line to change.
  site: 'https://shekhardhangar.com',
  output: 'static',
  integrations: [sitemap()],
  // Prefetch internal links as they enter the viewport so View-Transition
  // navigation is near-instant instead of waiting for a full round-trip on click.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  // Inline the small stylesheet into <head> so it isn't a render-blocking request.
  build: { inlineStylesheets: 'always' },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Source Code Pro',
      cssVariable: FONT_VARIABLE,
      weights: [400, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
  markdown: {
    // Dual Shiki themes: `defaultColor: false` emits `--shiki-light/--shiki-dark`
    // CSS vars instead of hard-coded colors, so global.css can switch code
    // colors with the site's `[data-theme]` toggle. Swap the theme names to
    // restyle (e.g. vitesse-light/vitesse-dark, catppuccin-latte/mocha).
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      transformers: [shikiCopyAttr()],
    },
    // Astro 6: plugins go through the processor; Shiki highlighting, heading
    // IDs, GFM and smartypants defaults are preserved by `unified()`. The
    // shikiConfig above reaches the processor via the shared markdown config.
    processor: unified({
      remarkPlugins: [remarkObsidianComments, remarkHighlights],
      rehypePlugins: [rehypeCallouts, rehypeLazyImages, rehypeLinkPreview],
    }),
  },
});
