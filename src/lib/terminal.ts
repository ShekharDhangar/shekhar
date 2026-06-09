import { SOCIAL_LINKS } from './links';
import { LANGUAGES, DOMAINS } from './profile';

export type Post = { slug: string; title: string };
export type SelectItem = { slug: string; title: string; path: string; external?: boolean };

const SECTIONS = ['blogs', 'learnings'] as const;
type Section = (typeof SECTIONS)[number];

export type OutputLine = {
  html: string;
  modifier?: 'muted' | 'err' | '';
};

export type CommandResult =
  | { type: 'lines';    lines: OutputLine[] }
  | { type: 'select';   items: SelectItem[] }
  | { type: 'navigate'; path: string }
  | { type: 'theme';    value: 'dark' | 'light' }
  | { type: 'clear' };

export type Context = {
  blogs: Post[];
  learnings: Post[];
  currentPath: string;
};

// ── Helpers ────────────────────────────────────────────────────

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape untrusted text before it is interpolated into innerHTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Tagged template that escapes every interpolated value automatically.
 * The literal markup is trusted; interpolations never are. Prefer this over
 * hand-calling escapeHtml so a dynamic value can't be forgotten:
 *
 *   html`command not found: ${userInput}`
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0];
  values.forEach((value, i) => {
    result += escapeHtml(String(value)) + strings[i + 1];
  });
  return result;
}

function line(html: string, modifier: OutputLine['modifier'] = ''): OutputLine {
  return { html, modifier };
}

function muted(html: string): OutputLine { return line(html, 'muted'); }
function err(html: string):   OutputLine { return line(html, 'err'); }

function postsToSelectItems(posts: Post[], section: Section): SelectItem[] {
  return posts.map(p => ({ ...p, path: `/${section}/${p.slug}` }));
}

function resolveSection(target: string): Section | null {
  const name = target.replace(/^\//, '');
  return SECTIONS.find(s => s === name) ?? null;
}

function postsIn(section: Section, ctx: Context): Post[] {
  return section === 'blogs' ? ctx.blogs : ctx.learnings;
}

function listSlugs(posts: Post[], emptyMsg: string): CommandResult {
  if (!posts.length) return { type: 'lines', lines: [muted(emptyMsg)] };
  return { type: 'lines', lines: posts.map(p => line(p.slug)) };
}

function parentPath(currentPath: string): string {
  const parts = currentPath.replace(/\/$/, '').split('/').filter(Boolean);
  if (!parts.length) return '/';
  parts.pop();
  if (!parts.length) return '/';
  return '/' + parts.join('/');
}

// ── Commands ───────────────────────────────────────────────────

function cmdHelp(): CommandResult {
  const entries: [string, string][] = [
    ['whoami',              'about me'],
    ['skills',              'tech stack'],
    ['contact',             'get in touch'],
    ['ls',                  'list dirs / files'],
    ['browse blogs (b)',    'select a blog post interactively'],
    ['browse learnings (b)','select a learning interactively'],
    ['browse contacts (b)', 'select a contact interactively'],
    ['cd /blogs',           'navigate to blogs'],
    ['cd /learnings',       'navigate to learnings'],
    ['cd ..',               'go up one level'],
    ['pwd',                 'print current path'],
    ['home',                'go to home page'],
    ['blogs',               'go to blogs'],
    ['learnings',           'go to learnings'],
    ['find <query>',         'full-text search across all posts'],
    ['open <slug>',         'open a post directly'],
    ['dark / light',        'switch color theme'],
    ['clear',               'clear terminal'],
  ];
  return {
    type: 'lines',
    lines: [
      muted('available commands:'),
      ...entries.map(([cmd, desc]) => line(`&nbsp; ${cmd.padEnd(18)} — ${desc}`)),
    ],
  };
}

function cmdWhoami(): CommandResult {
  return {
    type: 'lines',
    lines: [
      line('Shekhar Dhangar'),
      muted('Software Engineer — distributed systems, backend infra,'),
      muted('and whatever is interesting enough to pull me in.'),
    ],
  };
}

const SKILL_SEP = ' &nbsp;·&nbsp; ';

function cmdSkills(): CommandResult {
  return {
    type: 'lines',
    lines: [
      line(LANGUAGES.join(SKILL_SEP)),
      muted(DOMAINS.join(SKILL_SEP)),
    ],
  };
}

function cmdContact(): CommandResult {
  return {
    type: 'lines',
    lines: SOCIAL_LINKS.map(l =>
      line(html`<a href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`)
    ),
  };
}

function cmdLs(args: string[], ctx: Context): CommandResult {
  const target = args[0];

  if (!target) {
    const current = SECTIONS.find(s => ctx.currentPath.startsWith(`/${s}`));
    if (current) return listSlugs(postsIn(current, ctx), `no ${current} yet`);
    return { type: 'lines', lines: SECTIONS.map(s => line(`${s}/`)) };
  }

  const section = resolveSection(target);
  if (section) return listSlugs(postsIn(section, ctx), `no ${section} yet`);

  return { type: 'lines', lines: [err(html`ls: ${target}: no such directory`)] };
}

const CONTACTS: SelectItem[] = SOCIAL_LINKS.map(l => ({
  slug: l.slug,
  title: l.label,
  path: l.href,
  external: true,
}));

function cmdBrowse(args: string[], ctx: Context): CommandResult {
  const target = args[0];

  if (!target) {
    return { type: 'lines', lines: [err('usage: browse <blogs|learnings|contacts>')] };
  }

  if (target === 'contacts' || target === 'contact') {
    return { type: 'select', items: CONTACTS };
  }

  const section = resolveSection(target);
  if (section) {
    const posts = postsIn(section, ctx);
    if (!posts.length) return { type: 'lines', lines: [muted(`no ${section} yet`)] };
    return { type: 'select', items: postsToSelectItems(posts, section) };
  }

  return { type: 'lines', lines: [err(html`browse: ${target}: unknown`)] };
}

function cmdPwd(ctx: Context): CommandResult {
  return { type: 'lines', lines: [line(ctx.currentPath)] };
}

const HOME_ALIASES = new Set(['', '~', '/', '/home', '/home/shekhar']);

function cmdCd(args: string[], ctx: Context): CommandResult {
  const target = args[0] ?? '';

  if (HOME_ALIASES.has(target)) return { type: 'navigate', path: '/' };
  if (target === '..') return { type: 'navigate', path: parentPath(ctx.currentPath) };

  const section = resolveSection(target);
  if (section) return { type: 'navigate', path: `/${section}` };

  const post = target.match(/^\/?(blogs|learnings)\/([\w-]+)$/);
  if (post) return { type: 'navigate', path: `/${post[1]}/${post[2]}` };

  return { type: 'lines', lines: [err(html`cd: ${target}: no such directory`)] };
}

function cmdOpen(args: string[], ctx: Context): CommandResult {
  const slug = args[0];

  if (!slug) {
    return { type: 'lines', lines: [err('usage: open &lt;slug&gt;')] };
  }

  const blog = ctx.blogs.find(b => b.slug === slug);
  if (blog) return { type: 'navigate', path: `/blogs/${slug}` };

  const learning = ctx.learnings.find(l => l.slug === slug);
  if (learning) return { type: 'navigate', path: `/learnings/${slug}` };

  return { type: 'lines', lines: [err(html`open: ${slug}: not found`)] };
}

// ── Autocomplete ───────────────────────────────────────────────

const STATIC_CMDS = [
  'help', 'whoami', 'skills', 'contact', 'pwd', 'home', 'blogs', 'learnings', 'clear',
  'ls', 'ls blogs', 'ls learnings',
  'browse', 'browse blogs', 'browse learnings', 'browse contacts',
  'b blogs', 'b learnings', 'b contacts',
  'cd /blogs', 'cd /learnings', 'cd ..',
  'open', 'find', 'dark', 'light',
];

export function autocomplete(val: string): string | null {
  if (!val) return null;
  return STATIC_CMDS.find(c => c.startsWith(val) && c !== val) ?? null;
}

// ── Dispatcher ─────────────────────────────────────────────────

export function runCommand(raw: string, ctx: Context): CommandResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { type: 'lines', lines: [] };
  }

  const [cmd, ...args] = trimmed.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case 'help':      return cmdHelp();
    case 'whoami':    return cmdWhoami();
    case 'skills':    return cmdSkills();
    case 'contact':   return cmdContact();
    case 'ls':        return cmdLs(args, ctx);
    case 'browse':    return cmdBrowse(args, ctx);
    case 'b':         return cmdBrowse(args, ctx);
    case 'pwd':       return cmdPwd(ctx);
    case 'cd':        return cmdCd(args, ctx);
    case 'open':      return cmdOpen(args, ctx);
    case 'home':      return { type: 'navigate', path: '/' };
    case 'blogs':     return { type: 'navigate', path: '/blogs' };
    case 'learnings': return { type: 'navigate', path: '/learnings' };
    case 'dark':      return { type: 'theme', value: 'dark' };
    case 'light':     return { type: 'theme', value: 'light' };
    case 'clear':     return { type: 'clear' };
    default:
      return {
        type: 'lines',
        lines: [err(html`command not found: ${cmd} &nbsp;<span class="muted">(try 'help')</span>`)],
      };
  }
}
