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

/**
 * Build an inline <svg> icon node. Stroke/size/color come from CSS (.callout-icon).
 * The type name is kept only as an aria-label (Atlassian-style panels show no
 * visible type heading, but screen readers should still announce the kind).
 */
function iconElement(d: string, label: string): UNode {
  return {
    type: 'element',
    tagName: 'svg',
    properties: { className: ['callout-icon'], viewBox: '0 0 24 24', role: 'img', 'aria-label': label },
    children: [{ type: 'element', tagName: 'path', properties: { d }, children: [] }],
  };
}

/** A span holding an author-written custom title (only emitted when one exists). */
function titleTextNode(title: string): UNode {
  return { type: 'element', tagName: 'span', properties: { className: ['callout-title-text'] }, children: [{ type: 'text', value: title }] };
}

/**
 * Turn one blockquote element into an Atlassian-style callout panel, in place.
 * No-op if there's no [!type] marker. The auto type-name is NOT rendered as a
 * heading; the tinted background + icon carry the meaning. A custom title, if
 * the author wrote one, is shown.
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
  const def = CALLOUT_TYPES[canonical];
  const icon = iconElement(def.icon, def.label);

  // Strip the marker line; keep any same-paragraph body text.
  firstText.value = bodyRest;
  if (bodyRest.trim() === '' && (firstP.children ?? []).length === 1) {
    node.children = (node.children ?? []).filter((c) => c !== firstP);
  }

  node.properties = { className: ['callout'], 'data-callout': canonical };

  if (fold === '-' || fold === '+') {
    const summaryChildren = title ? [icon, titleTextNode(title)] : [icon];
    const summary: UNode = { type: 'element', tagName: 'summary', properties: { className: ['callout-summary'] }, children: summaryChildren };
    const content: UNode = { type: 'element', tagName: 'div', properties: { className: ['callout-content'] }, children: node.children ?? [] };
    node.tagName = 'details';
    if (fold === '+') node.properties.open = true;
    node.children = [summary, content];
    return;
  }

  const titleEl: UNode[] = title ? [{ type: 'element', tagName: 'div', properties: { className: ['callout-title'] }, children: [{ type: 'text', value: title }] }] : [];
  const content: UNode = { type: 'element', tagName: 'div', properties: { className: ['callout-content'] }, children: [...titleEl, ...(node.children ?? [])] };
  node.tagName = 'div';
  node.children = [icon, content];
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
