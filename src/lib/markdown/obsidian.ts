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

// Canonical types. data-callout uses these keys; CSS maps each to a background.
const CALLOUT_TYPES = new Set([
  'note', 'abstract', 'info', 'todo', 'tip', 'success',
  'question', 'warning', 'failure', 'danger', 'bug', 'example', 'quote',
]);

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
  if (CALLOUT_TYPES.has(raw)) return raw;
  if (CALLOUT_ALIASES[raw]) return CALLOUT_ALIASES[raw];
  return 'note';
}

/** A span holding an author-written custom title (only emitted when one exists). */
function titleTextNode(title: string): UNode {
  return { type: 'element', tagName: 'span', properties: { className: ['callout-title-text'] }, children: [{ type: 'text', value: title }] };
}

/**
 * Turn one blockquote element into a plain tinted callout panel, in place.
 * No-op if there's no [!type] marker. There's no icon and no auto type-name —
 * the background color alone signals the kind. A custom title, if the author
 * wrote one, is shown.
 */
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

  // Strip the marker line; keep any same-paragraph body text.
  firstText.value = bodyRest;
  if (bodyRest.trim() === '' && (firstP.children ?? []).length === 1) {
    node.children = (node.children ?? []).filter((c) => c !== firstP);
  }

  node.properties = { className: ['callout'], 'data-callout': canonical };

  if (fold === '-' || fold === '+') {
    const summaryChildren = title ? [titleTextNode(title)] : [];
    const summary: UNode = { type: 'element', tagName: 'summary', properties: { className: ['callout-summary'] }, children: summaryChildren };
    const content: UNode = { type: 'element', tagName: 'div', properties: { className: ['callout-content'] }, children: node.children ?? [] };
    node.tagName = 'details';
    if (fold === '+') node.properties.open = true;
    node.children = [summary, content];
    return;
  }

  const titleEl: UNode[] = title ? [{ type: 'element', tagName: 'div', properties: { className: ['callout-title'] }, children: [{ type: 'text', value: title }] }] : [];
  node.tagName = 'div';
  node.children = [...titleEl, ...(node.children ?? [])];
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
