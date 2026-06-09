import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';

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
    // Astro 6: plugins go through the processor; Shiki highlighting, heading
    // IDs, GFM and smartypants defaults are preserved by `unified()`.
    processor: unified({ rehypePlugins: [rehypeLazyImages] }),
  },
});
