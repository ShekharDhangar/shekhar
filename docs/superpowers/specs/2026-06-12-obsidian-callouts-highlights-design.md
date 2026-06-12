# Obsidian Callouts & Highlights Rendering — Design

**Date:** 2026-06-12
**Status:** Approved (pending implementation plan)

## Problem

The site renders Obsidian markdown notes (`src/content/learnings/*.md`) through Astro's
built-in `@astrojs/markdown-remark` pipeline. That pipeline handles GitHub-Flavored
Markdown but has **zero** handling for Obsidian-flavored syntax. As a result:

- `> [!note]` / `> [!example]` callouts fall through as plain blockquotes with the
  literal `[!note]` text visible.
- `==highlights==` render as literal `==text==`.
- `%%comments%%` render as literal text instead of being hidden.

The goal is to render these three Obsidian features properly, with callouts matching
Obsidian's native look (colored, icon + header label, tinted rounded box).

## Scope

**In scope:**

1. **Callouts** — the headline feature. Obsidian-faithful appearance.
2. **Highlights** — `==text==` → `<mark>`.
3. **Comment stripping** — `%%comment%%` removed from output.

**Out of scope (explicit decisions):**

- Wikilinks (`[[Note]]`) — the author does not cross-link notes.
- Image embeds (`![[image.png]]`) — notes are text-only.
- Note transclusion (`![[Note]]` inlining content).
- Math / KaTeX (`$...$`, `$$...$$`).
- `#tag` styling.

Because wikilinks are out of scope, **no slug resolution and no changes to
`content.config.ts` or the route are required.**

## Guiding principle

The codebase already hand-writes small, zero-dependency, well-commented remark/rehype
plugins (`rehypeLazyImages`, `rehypeLinkPreview` in `astro.config.mjs`). This work
**matches that pattern** — small focused plugins in the same house style — rather than
pulling in npm packages. This keeps full styling control, avoids dependency drift, and
won't collide with the existing Shiki / copy-button / link-preview setup.

## Components

The three plugins are **extracted into an importable, unit-tested TS module** —
`src/lib/markdown/obsidian.ts` — and imported into `astro.config.mjs`. This follows
AGENTS.md's core convention: *logic lives in `src/lib` and is unit-tested; `.astro` (and
config) files stay thin.* Each plugin hand-rolls its own tree walking (no
`unist-util-visit` dependency) to match the existing house style.

The two existing plugins (`rehypeLazyImages`, `rehypeLinkPreview`) stay inline in
`astro.config.mjs` — this work does not move them.

### AGENTS.md constraints baked into the implementation

This repo's `scripts/lint-rules.mjs` **fails the build** on certain patterns, so the
plugins must be written to pass the linter the first time (no escape hatches):

- **No `else` / `else if`** — use early returns / guard clauses throughout.
- **`if`-nesting ≤ 2 levels**, **no nested loops**, **≤ 2 loops per function** — favor
  recursion for tree walking and extract helpers so no single function nests deeply.
- **No swallowed errors** — any `catch` logs or rethrows.
- **No long string literal repeated 3+ times** — drives the type table design below.

Two further AGENTS.md points shape the design:

- **Single source of truth + no duplicate strings:** one `CALLOUT_TYPES` table keyed by
  canonical type holds `{ label, color, iconPath }`; an `ALIASES` map resolves
  `summary→abstract`, `error→danger`, etc. to a canonical key. Colors/labels/icon paths
  each appear exactly once — no repeated long strings, and adding a type is a one-line
  table edit.
- **Security at the HTML boundary:** the plugins build **hast element nodes**
  (`{ type: 'element', tagName, properties, children }`), never raw HTML strings or
  `innerHTML`. The hast→HTML serializer escapes text, so there is no injection surface.
  This also keeps note content trusted-but-safe.

**Graceful degradation (not "fail loud") for malformed content:** unlike `linkHref`
(which throws on a bad *slug* — a programmer error), a malformed/unknown callout in a
*note* must never crash the static build. Unknown types fall back to the `note` style and
non-callout blockquotes pass through untouched. This matches AGENTS.md's "customizations
stay portable / degrade gracefully" convention for Markdown extras.

### 1. `rehypeCallouts` (rehype — operates on the HTML/hast tree)

Walks the tree and transforms any `<blockquote>` whose first paragraph's leading text
matches `^\[!(\w+)\]([-+]?)\s*(.*)` into a callout.

**Parsing:**

- The blockquote's first child paragraph's first text node holds
  `"[!type] Title\nbody..."` (Markdown soft line breaks are literal `\n` in the text
  node).
- Match the marker on the **first line only**:
  `^\[!(\w+)\]([-+]?)[ \t]*([^\n]*)(\n?)([\s\S]*)$`
  - group 1 = type (lowercased for lookup)
  - group 2 = collapse flag (`-` collapsed, `+` open, empty = not collapsible)
  - group 3 = inline custom title (may be empty)
  - group 5 = remaining body text
- Strip the marker line from that text node (set its value to the body remainder). If
  the paragraph is left empty, remove it.

**Output structure:**

- Non-collapsible: mutate the blockquote node to
  `<div class="callout" data-callout="<type>">`.
- Collapsible: mutate to `<details class="callout" data-callout="<type>">` with `open`
  set when the flag is `+`.
- Prepend a title element:
  - Non-collapsible: `<div class="callout-title">…</div>`
  - Collapsible: `<summary class="callout-title">…</summary>`
  - Title contents = inline SVG icon for the type + `<span class="callout-title-text">`
    holding the custom title, or the capitalized type name if no custom title.
- Remaining children stay as the callout body (optionally wrapped in
  `<div class="callout-content">` for styling).

**Type support (canonical + aliases), each with a color + Lucide-style SVG icon:**

| Canonical | Aliases | Color family |
|-----------|---------|--------------|
| note | — | blue |
| abstract | summary, tldr | cyan |
| info | — | blue |
| todo | — | blue |
| tip | hint, important | teal/cyan |
| success | check, done | green |
| question | help, faq | yellow |
| warning | caution, attention | amber |
| failure | fail, missing | red |
| danger | error | red |
| bug | — | red |
| example | — | purple |
| quote | cite | gray |

Unknown types fall back to the `note` style (default color + a generic icon).

**Nesting:** nested blockquotes become nested callouts naturally, because the walker
processes every blockquote in the tree.

**Robustness:** a blockquote that does not start with a `[!type]` marker is left
completely untouched (normal blockquote rendering still works).

### 2. `remarkHighlights` (remark — operates on the markdown/mdast tree)

Walks markdown **text nodes only** and converts `==text==` into a `<mark>` (an
`html`/element node). Because it only visits text nodes, content inside code fences and
inline code is never affected — `==x==` in a code block stays literal, which is correct.

### 3. `remarkObsidianComments` (remark — operates on the markdown/mdast tree)

Walks markdown text nodes and strips `%%comment%%`:

- Inline comments are removed from within text.
- Whole-line / block comments are removed; paragraphs left empty by removal are pruned.
- Operates on text nodes only, so code is never touched.

## Wiring

In `astro.config.mjs`, import the plugins from `src/lib/markdown/` and wire them into
`markdown.processor`:

```js
import { remarkObsidianComments, remarkHighlights, rehypeCallouts } from './src/lib/markdown/obsidian.ts';
// ...
processor: unified({
  remarkPlugins: [remarkObsidianComments, remarkHighlights],
  rehypePlugins: [rehypeCallouts, rehypeLazyImages, rehypeLinkPreview],
})
```

- Comments + highlights run as remark plugins (mdast, before HTML generation).
- `rehypeCallouts` runs as a rehype plugin. Order relative to `rehypeLazyImages` /
  `rehypeLinkPreview` does not matter for correctness here (no image embeds in scope),
  but callouts are listed first for readability.
- Shiki config, copy-button transformer, fonts, sitemap, prefetch all stay untouched.

## Styling (`src/styles/global.css`, `.prose` scope)

- `.callout` base: tinted rounded box, colored left/header accent, padding matching the
  existing prose rhythm, Source Code Pro font.
- `.callout-title`: row layout, icon + label, colored per type, bold/uppercase to taste
  to echo Obsidian.
- Per-type accent + tint driven by `[data-callout="<type>"]` selectors (with alias types
  mapped to the same color). Implemented via CSS custom properties per type for the
  accent color, with a subtle translucent background tint of the same hue.
- `<details>.callout` collapse styling: summary cursor, marker handling, open/closed
  spacing.
- Icon SVGs inherit the type color via `currentColor` / `fill`.
- `mark`: highlight background + readable foreground that works in both light and dark
  themes (the site has a `[data-theme]` toggle — use theme-aware values).

## Error handling

- Malformed or unknown callout types → fall back to default (`note`) style; never crash.
- Non-callout blockquotes → untouched.
- `==` / `%%` that don't form valid pairs → left as literal text (no greedy matching
  across blocks).
- Code blocks / inline code → never transformed (guaranteed by visiting text nodes only).

## Verification

The repo runs vitest via `npm test` (existing example: `src/lib/terminal.test.ts`).
Because the plugins are extracted into `src/lib/markdown/`, they get real unit tests,
built TDD-style (test first, then implement):

- **Unit tests** (`src/lib/markdown/obsidian.test.ts`) exercising each plugin against
  small fixtures: each callout type and alias, a custom title, a collapsed (`-`) and open
  (`+`) callout, a nested callout, an unknown type (falls back to `note`), a plain
  blockquote (untouched), `==highlight==`, inline + block `%%comment%%`, and the critical
  case of `==x==` / `%%x%%` inside a code fence staying literal.
- **Gate (AGENTS.md "before you finish")**: `npm run check`, `npm run lint`, and
  `npm test` all pass. The pre-commit hook runs lint + tests, so green local is required.
- **Build check**: `npm run build` succeeds with the new processor config.
- **Visual pass** on `src/content/learnings/The Answer is Elsewhere - DNS.md`, which
  already contains `[!example]`, `[!note]`, and `==highlights==`.

## Files touched

- `src/lib/markdown/obsidian.ts` (new) — the three plugins + icon/type map.
- `src/lib/markdown/obsidian.test.ts` (new) — vitest unit tests.
- `astro.config.mjs` — import the plugins + wire into `processor`.
- `src/styles/global.css` — callout + mark styles within `.prose`.
- (No changes to `content.config.ts` or `src/pages/learnings/[slug].astro`.)
