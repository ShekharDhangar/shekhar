# Obsidian Callouts & Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Obsidian callouts (`> [!note]`), highlights (`==text==`), and comments (`%%hidden%%`) properly in the published Astro site, matching Obsidian's native callout look.

**Architecture:** Three small hand-written remark/rehype plugins live in one importable, unit-tested TS module (`src/lib/markdown/obsidian.ts`) and are wired into the existing `unified({...})` markdown processor in `astro.config.mjs`. Styling is added to the existing `.prose` block in `global.css`. No new npm dependencies.

**Tech Stack:** Astro 6, `@astrojs/markdown-remark` (`unified` + `createMarkdownProcessor`), Vitest, hast/mdast trees (hand-walked, no `unist-util-visit`).

---

## Background the engineer needs

**The markdown pipeline.** Astro builds its processor from `markdown.processor: unified({ remarkPlugins, rehypePlugins })` in `astro.config.mjs`. Despite the name, this `unified` is a custom factory from `@astrojs/markdown-remark` that stores the plugin arrays on `.options`; Astro then builds the real pipeline in this order:

```
remarkParse → remarkGfm → remarkSmartypants → [our remarkPlugins]
→ remarkRehype(allowDangerousHtml) → rehypeShiki → [our rehypePlugins]
→ rehypeImages → rehypeHeadingIds → rehypeRaw → rehypeStringify
```

So **remark plugins see the markdown (mdast) tree**; **rehype plugins see the HTML (hast) tree** after markdown→HTML conversion. `createMarkdownProcessor({ remarkPlugins, rehypePlugins })` from the same package builds an identical pipeline and exposes `.render(md) → { code }` — that is our test harness, and it faithfully reproduces what the real config does.

**Node shapes.** Both trees are nodes with `children`. We use one minimal interface (`UNode`) for both:
- Text node: `{ type: 'text', value: '...' }`
- mdast inline (markdown side): e.g. `emphasis`, `paragraph`
- hast element (HTML side): `{ type: 'element', tagName: 'div', properties: {...}, children: [...] }`

**Why `type: 'emphasis'` for highlights:** mdast has no `mark` node. Setting a node's `data.hName` makes `mdast-util-to-hast` rewrite the output tag. The `emphasis` handler always runs and always calls `applyData` (which honors `data.hName`), so `{ type: 'emphasis', data: { hName: 'mark' }, children: [text] }` reliably becomes `<mark>…</mark>`.

**Linter constraints (`npm run lint`, runs in the pre-commit hook — must pass):** no `else`/`else if` (use guard returns), `if`-nesting ≤ 2, no nested loops, ≤ 2 loops per function, no swallowed errors, no string literal ≥ 10 chars containing non-`[\w-]` repeated 3+ times. The code below is written to pass as-is. `.map`/`.filter`/`.find`/`.forEach`/`.some`/`.every` are method calls, not loops — they don't count against the loop rules (the existing `rehypeLazyImages` uses them).

**Files map:**
- Create `src/lib/markdown/obsidian.ts` — the three plugins + the callout type table + icon helper.
- Create `src/lib/markdown/obsidian.test.ts` — Vitest unit tests.
- Modify `astro.config.mjs` — import the three plugins, add them to `processor`.
- Modify `src/styles/global.css` — callout + highlight styles in the `.prose` scope.

---

## Task 1: Module scaffold + `remarkHighlights`

**Files:**
- Create: `src/lib/markdown/obsidian.ts`
- Test: `src/lib/markdown/obsidian.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/markdown/obsidian.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkHighlights, remarkObsidianComments, rehypeCallouts } from './obsidian';

// Render markdown through the SAME pipeline shape the real Astro config uses.
async function render(md: string): Promise<string> {
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false, // faster; our plugins never touch code highlighting
    remarkPlugins: [remarkObsidianComments, remarkHighlights],
    rehypePlugins: [rehypeCallouts],
  });
  const { code } = await processor.render(md);
  return code;
}

describe('remarkHighlights', () => {
  it('wraps ==text== in <mark>', async () => {
    const html = await render('Some ==highlighted== words.');
    expect(html).toContain('<mark>highlighted</mark>');
  });

  it('handles multiple highlights in one line', async () => {
    const html = await render('==a== and ==b==');
    expect(html).toContain('<mark>a</mark>');
    expect(html).toContain('<mark>b</mark>');
  });

  it('leaves == inside a code fence literal', async () => {
    const html = await render('```\n==x==\n```');
    expect(html).toContain('==x==');
    expect(html).not.toContain('<mark>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: FAIL — `Failed to resolve import "./obsidian"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/markdown/obsidian.ts`:

```ts
/**
 * Obsidian-flavored Markdown plugins for the Astro pipeline.
 *
 * Hand-written, zero-dependency remark/rehype plugins (same house style as the
 * inline plugins in astro.config.mjs). One minimal node type covers both the
 * markdown (mdast) and HTML (hast) trees, since both are just nodes + children.
 */

/** Minimal structural node — works for both mdast and hast. */
export interface UNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: UNode[];
  properties?: Record<string, unknown>;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const HIGHLIGHT_RE = /==(.+?)==/g;

/** Split a raw string into text + <mark> nodes. Returns [] when there's no match. */
function splitHighlights(value: string): UNode[] {
  const out: UNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  HIGHLIGHT_RE.lastIndex = 0;
  while ((match = HIGHLIGHT_RE.exec(value)) !== null) {
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    // `emphasis` + data.hName:'mark' reliably serializes to <mark> via mdast-util-to-hast.
    out.push({ type: 'emphasis', data: { hName: 'mark' }, children: [{ type: 'text', value: match[1] }] });
    last = match.index + match[0].length;
  }
  if (last === 0) return [];
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

/** Walk an mdast tree, replacing ==text== inside text nodes with <mark> nodes. */
function markHighlights(node: UNode): void {
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type !== 'text' || child.value === undefined) {
      markHighlights(child);
      continue;
    }
    const replacement = splitHighlights(child.value);
    if (replacement.length === 0) continue;
    children.splice(i, 1, ...replacement);
    i += replacement.length - 1;
  }
}

/** remark plugin: ==text== → <mark>text</mark>. */
export function remarkHighlights() {
  return (tree: UNode) => markHighlights(tree);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: FAIL — `remarkObsidianComments` and `rehypeCallouts` are imported by the test but not yet exported. The three `remarkHighlights` assertions themselves are correct, but the import error blocks the file. Add temporary no-op stubs so this task's tests run green:

Append to `src/lib/markdown/obsidian.ts`:

```ts
/** Temporary stub — implemented in Task 2. */
export function remarkObsidianComments() {
  return (_tree: UNode) => {};
}

/** Temporary stub — implemented in Task 3. */
export function rehypeCallouts() {
  return (_tree: UNode) => {};
}
```

Re-run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: `✓ custom lint rules passed`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/markdown/obsidian.ts src/lib/markdown/obsidian.test.ts
git commit -m "feat: remarkHighlights plugin for ==text== → <mark>"
```

---

## Task 2: `remarkObsidianComments`

**Files:**
- Modify: `src/lib/markdown/obsidian.ts` (replace the `remarkObsidianComments` stub)
- Test: `src/lib/markdown/obsidian.test.ts` (add a describe block)

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `src/lib/markdown/obsidian.test.ts`:

```ts
describe('remarkObsidianComments', () => {
  it('strips inline %%comments%%', async () => {
    const html = await render('Before %%secret note%% after.');
    expect(html).not.toContain('secret note');
    expect(html).toContain('Before');
    expect(html).toContain('after.');
  });

  it('strips a whole %% block %% and leaves no empty paragraph', async () => {
    const html = await render('%%\nhidden block\n%%');
    expect(html).not.toContain('hidden block');
    expect(html).not.toContain('<p></p>');
  });

  it('does not touch %% inside a code fence', async () => {
    const html = await render('```\n%%keep%%\n```');
    expect(html).toContain('%%keep%%');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: FAIL — the stub leaves `secret note` / `hidden block` in the output.

- [ ] **Step 3: Write the implementation**

In `src/lib/markdown/obsidian.ts`, **replace the entire `remarkObsidianComments` stub** with:

```ts
const COMMENT_RE = /%%[\s\S]*?%%/g;

/** A paragraph whose only content is now whitespace (left behind after stripping). */
function isEmptyParagraph(node: UNode): boolean {
  if (node.type !== 'paragraph') return false;
  const kids = node.children ?? [];
  return kids.every((k) => k.type === 'text' && (k.value ?? '').trim() === '');
}

/** Walk an mdast tree, removing %%comment%% text and pruning emptied paragraphs. */
function stripComments(node: UNode): void {
  const children = node.children;
  if (!children) return;
  for (const child of children) {
    if (child.type === 'text' && child.value !== undefined) child.value = child.value.replace(COMMENT_RE, '');
    stripComments(child);
  }
  node.children = children.filter((c) => !isEmptyParagraph(c));
}

/** remark plugin: remove %%comments%% (inline and block) from the output. */
export function remarkObsidianComments() {
  return (tree: UNode) => stripComments(tree);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: `✓ custom lint rules passed`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/markdown/obsidian.ts src/lib/markdown/obsidian.test.ts
git commit -m "feat: remarkObsidianComments plugin to strip %%comments%%"
```

---

## Task 3: `rehypeCallouts`

This is the headline feature: turn blockquotes that start with `[!type]` into Obsidian-style callout boxes (icon + colored title + tinted box), with custom titles, collapsible `-`/`+`, nesting, and a safe fallback for unknown types.

**Files:**
- Modify: `src/lib/markdown/obsidian.ts` (replace the `rehypeCallouts` stub)
- Test: `src/lib/markdown/obsidian.test.ts` (add a describe block)

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `src/lib/markdown/obsidian.test.ts`:

```ts
describe('rehypeCallouts', () => {
  it('renders a basic [!note] callout', async () => {
    const html = await render('> [!note]\n> hello world');
    expect(html).toContain('class="callout"');
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('hello world');
    expect(html).toContain('Note'); // default label
    expect(html).toContain('<svg'); // icon present
  });

  it('uses a custom title when provided', async () => {
    const html = await render('> [!warning] Watch out\n> body text');
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain('Watch out');
  });

  it('resolves an alias to its canonical type', async () => {
    const html = await render('> [!summary]\n> x');
    expect(html).toContain('data-callout="abstract"');
  });

  it('falls back to note for an unknown type', async () => {
    const html = await render('> [!banana]\n> x');
    expect(html).toContain('data-callout="note"');
  });

  it('renders a collapsible callout as <details>', async () => {
    const collapsed = await render('> [!note]-\n> body');
    expect(collapsed).toContain('<details');
    expect(collapsed).toContain('<summary');
    expect(collapsed).not.toContain('open');

    const open = await render('> [!tip]+\n> body');
    expect(open).toContain('<details');
    expect(open).toContain('open');
  });

  it('leaves a plain blockquote untouched', async () => {
    const html = await render('> just an ordinary quote');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('callout');
  });

  it('supports nested callouts', async () => {
    const html = await render('> [!note]\n> outer\n> > [!warning]\n> > inner');
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('data-callout="warning"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: FAIL — the stub does nothing, so `class="callout"` is absent.

- [ ] **Step 3: Write the implementation**

In `src/lib/markdown/obsidian.ts`, **replace the entire `rehypeCallouts` stub** with the following.

First, the icon set (one `const` per glyph so no path string is ever a repeated literal — these are simple, valid 24×24 stroke paths; swap for richer Lucide paths later by editing these consts):

```ts
// ── Callout icons (simple valid stroke paths, 24×24) ────────────────────────
const ICON_PENCIL = 'M3 21l3-1L20 6l-2-2L4 18z';
const ICON_INFO = 'M12 16v-5m0-3h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0';
const ICON_FLAME = 'M12 22a7 7 0 0 0 4-12c0 3-2 4-2 4 0-4-3-6-5-8-1 4-4 5-4 9a7 7 0 0 0 7 7z';
const ICON_CHECK = 'M4 12l5 5L20 6';
const ICON_QUESTION = 'M9 9a3 3 0 1 1 4 2.8c-1 .6-1 1-1 2m0 3h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0';
const ICON_ALERT = 'M12 3L2 20h20zM12 10v4m0 3h.01';
const ICON_LIST = 'M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01';
const ICON_QUOTE = 'M6 17l3-6V7H4v6h3zm9 0l3-6V7h-5v6h3z';

interface CalloutDef {
  label: string;
  icon: string;
}

// Canonical types only. data-callout uses these keys; CSS maps them to colors.
const CALLOUT_TYPES: Record<string, CalloutDef> = {
  note: { label: 'Note', icon: ICON_PENCIL },
  abstract: { label: 'Abstract', icon: ICON_INFO },
  info: { label: 'Info', icon: ICON_INFO },
  todo: { label: 'Todo', icon: ICON_CHECK },
  tip: { label: 'Tip', icon: ICON_FLAME },
  success: { label: 'Success', icon: ICON_CHECK },
  question: { label: 'Question', icon: ICON_QUESTION },
  warning: { label: 'Warning', icon: ICON_ALERT },
  failure: { label: 'Failure', icon: ICON_ALERT },
  danger: { label: 'Danger', icon: ICON_ALERT },
  bug: { label: 'Bug', icon: ICON_ALERT },
  example: { label: 'Example', icon: ICON_LIST },
  quote: { label: 'Quote', icon: ICON_QUOTE },
};

// Aliases → canonical type.
const CALLOUT_ALIASES: Record<string, string> = {
  summary: 'abstract',
  tldr: 'abstract',
  hint: 'tip',
  important: 'tip',
  check: 'success',
  done: 'success',
  help: 'question',
  faq: 'question',
  caution: 'warning',
  attention: 'warning',
  fail: 'failure',
  missing: 'failure',
  error: 'danger',
  cite: 'quote',
};

// First line: [!type], optional fold flag (- or +), optional title; rest is body.
const CALLOUT_RE = /^\[!(\w+)\]([-+]?)[ \t]*(.*?)[ \t]*(?:\r?\n([\s\S]*))?$/;

function resolveCalloutType(raw: string): string {
  if (CALLOUT_TYPES[raw]) return raw;
  if (CALLOUT_ALIASES[raw]) return CALLOUT_ALIASES[raw];
  return 'note';
}

/** Build an inline <svg> icon node. Stroke/size come from CSS (.callout-icon). */
function iconElement(d: string): UNode {
  return {
    type: 'element',
    tagName: 'svg',
    properties: { className: ['callout-icon'], viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    children: [{ type: 'element', tagName: 'path', properties: { d }, children: [] }],
  };
}

/** Turn one blockquote element into a callout, in place. No-op if no [!type] marker. */
function transformCallout(node: UNode): void {
  const firstP = (node.children ?? []).find((c) => c.tagName === 'p');
  if (!firstP) return;
  const firstText = (firstP.children ?? [])[0];
  if (!firstText || firstText.type !== 'text' || firstText.value === undefined) return;
  const match = firstText.value.match(CALLOUT_RE);
  if (!match) return;

  const fold = match[2];
  const title = match[3].trim();
  const bodyRest = match[4] ?? '';
  const canonical = resolveCalloutType(match[1].toLowerCase());
  const def = CALLOUT_TYPES[canonical];

  // Strip the marker line; keep any same-paragraph body text.
  firstText.value = bodyRest;
  if (bodyRest.trim() === '' && (firstP.children ?? []).length === 1) {
    node.children = (node.children ?? []).filter((c) => c !== firstP);
  }

  const foldable = fold === '-' || fold === '+';
  const titleEl: UNode = {
    type: 'element',
    tagName: foldable ? 'summary' : 'div',
    properties: { className: ['callout-title'] },
    children: [
      iconElement(def.icon),
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['callout-title-text'] },
        children: [{ type: 'text', value: title || def.label }],
      },
    ],
  };

  node.tagName = foldable ? 'details' : 'div';
  node.properties = { className: ['callout'], 'data-callout': canonical };
  if (fold === '+') node.properties.open = true;
  node.children = [titleEl, ...(node.children ?? [])];
}

/** Walk a hast tree; transform every blockquote, then recurse (nesting works). */
function walkCallouts(node: UNode): void {
  const children = node.children;
  if (!children) return;
  for (const child of children) {
    if (child.tagName === 'blockquote') transformCallout(child);
    walkCallouts(child);
  }
}

/** rehype plugin: blockquotes starting with [!type] → Obsidian callout boxes. */
export function rehypeCallouts() {
  return (tree: UNode) => walkCallouts(tree);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/markdown/obsidian.test.ts`
Expected: PASS (all describe blocks green — 14 tests total across Tasks 1–3).

- [ ] **Step 5: Verify lint + types pass**

Run: `npm run lint && npx astro check`
Expected: lint prints `✓ custom lint rules passed`; `astro check` reports `0 errors` for `src/lib/markdown/obsidian.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/markdown/obsidian.ts src/lib/markdown/obsidian.test.ts
git commit -m "feat: rehypeCallouts plugin for Obsidian [!type] callouts"
```

---

## Task 4: Wire the plugins into the Astro config

**Files:**
- Modify: `astro.config.mjs:1-2` (add import) and `astro.config.mjs:102` (extend processor)

- [ ] **Step 1: Add the import**

At the top of `astro.config.mjs`, after the existing imports (around line 3), add:

```js
import { remarkObsidianComments, remarkHighlights, rehypeCallouts } from './src/lib/markdown/obsidian';
```

- [ ] **Step 2: Extend the processor**

In `astro.config.mjs`, replace this line (currently line 102):

```js
    processor: unified({ rehypePlugins: [rehypeLazyImages, rehypeLinkPreview] }),
```

with:

```js
    processor: unified({
      remarkPlugins: [remarkObsidianComments, remarkHighlights],
      rehypePlugins: [rehypeCallouts, rehypeLazyImages, rehypeLinkPreview],
    }),
```

- [ ] **Step 3: Verify the build picks up the config**

Run: `npm run build`
Expected: build succeeds (`Complete!`), with no `[astro] ... processor doesn't run them` warning. If the build errors on resolving `./src/lib/markdown/obsidian`, change the import specifier to `./src/lib/markdown/obsidian.ts`.

- [ ] **Step 4: Confirm callouts/highlights render in the built output**

Run: `grep -rl 'data-callout="example"' dist/learnings/ && grep -rl '<mark>' dist/learnings/`
Expected: both grep commands print the path to the built DNS note (the note contains `[!example]`, `[!note]`, and `==highlights==`), proving the plugins ran end-to-end through the real config.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs
git commit -m "feat: wire Obsidian callout/highlight/comment plugins into markdown processor"
```

---

## Task 5: Callout + highlight styling

**Files:**
- Modify: `src/styles/global.css` (append to the `.prose` section, near the existing blockquote rule around line 463)

- [ ] **Step 1: Add the styles**

Append the following to `src/styles/global.css`, immediately after the existing `.prose blockquote { … }` rule:

```css
/* ── Obsidian callouts ─────────────────────────────────────────── */
.prose .callout {
  --callout-rgb: 124, 124, 124;
  margin: 20px 0;
  padding: 12px 16px;
  border: 1px solid rgb(var(--callout-rgb) / 0.3);
  border-radius: 8px;
  background: rgb(var(--callout-rgb) / 0.07);
}
.prose .callout > :first-child { margin-top: 0; }
.prose .callout > :last-child { margin-bottom: 0; }
.prose .callout-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  color: rgb(var(--callout-rgb));
  font-weight: 800;
}
.prose details.callout > .callout-title { cursor: pointer; }
.prose details.callout > .callout-title::-webkit-details-marker { display: none; }
.prose details.callout:not([open]) > .callout-title { margin-bottom: 0; }
.prose .callout-icon {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.prose [data-callout="note"],
.prose [data-callout="info"] { --callout-rgb: 8, 109, 221; }
.prose [data-callout="abstract"] { --callout-rgb: 0, 191, 188; }
.prose [data-callout="todo"] { --callout-rgb: 8, 109, 221; }
.prose [data-callout="tip"] { --callout-rgb: 0, 191, 165; }
.prose [data-callout="success"] { --callout-rgb: 8, 185, 78; }
.prose [data-callout="question"] { --callout-rgb: 224, 165, 14; }
.prose [data-callout="warning"] { --callout-rgb: 236, 117, 0; }
.prose [data-callout="failure"],
.prose [data-callout="danger"],
.prose [data-callout="bug"] { --callout-rgb: 233, 49, 71; }
.prose [data-callout="example"] { --callout-rgb: 120, 82, 238; }
.prose [data-callout="quote"] { --callout-rgb: 124, 124, 124; }

/* ── Obsidian highlights ───────────────────────────────────────── */
.prose mark {
  background: rgb(255 214 10 / 0.30);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}
```

- [ ] **Step 2: Rebuild and lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; `✓ custom lint rules passed` (the linter only scans TS, not CSS, but run it to confirm nothing else regressed).

- [ ] **Step 3: Visual check**

Run: `npm run dev`, open the DNS learning note in a browser, and confirm:
- `[!example]` and `[!note]` render as tinted, colored, icon-titled boxes (matching the Obsidian look).
- `==highlights==` show a yellow highlight.
- The first `[!note]` callout color/icon resembles the target screenshot.

Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: style Obsidian callouts and highlights in prose"
```

---

## Task 6: Final verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full project gate (AGENTS.md "before you finish")**

Run: `npm run check && npm run lint && npm test`
Expected: all three pass — `astro check` 0 errors, `✓ custom lint rules passed`, and Vitest reports all tests passing (the 14 new tests plus the existing 61).

- [ ] **Step 2: Confirm clean tree**

Run: `git status`
Expected: working tree clean (everything committed across Tasks 1–5).

---

## Self-review notes (already incorporated)

- **Spec coverage:** callouts (Task 3 + 5), highlights (Task 1 + 5), comment-stripping (Task 2), extraction into a unit-tested `src/lib` TS module (all tasks), wiring without disturbing Shiki/copy-buttons/link-previews/lazy-images (Task 4), AGENTS.md lint compliance and the `check`/`lint`/`test` gate (Task 6). Out-of-scope items (wikilinks, image embeds, transclusion, math, tags) are intentionally absent.
- **Type consistency:** `UNode`, `remarkHighlights`, `remarkObsidianComments`, `rehypeCallouts`, `CALLOUT_TYPES`, `CALLOUT_ALIASES`, `resolveCalloutType`, `iconElement`, `transformCallout`, `walkCallouts` are named identically everywhere they appear.
- **No placeholders:** every code and command step is complete and runnable.
