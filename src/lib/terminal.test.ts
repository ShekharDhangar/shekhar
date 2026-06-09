import { describe, it, expect } from 'vitest';
import { runCommand, autocomplete, escapeHtml, html } from './terminal';
import type { Context } from './terminal';

// ── Fixtures ───────────────────────────────────────────────────

const BLOGS = [
  { slug: 'raft-consensus',   title: 'Understanding Raft Consensus' },
  { slug: 'go-channels',      title: 'Go Channel Patterns' },
];

const LEARNINGS = [
  { slug: 'rust-lifetimes',   title: 'Rust Lifetimes' },
];

const ctx = (currentPath = '/'): Context => ({
  blogs: BLOGS,
  learnings: LEARNINGS,
  currentPath,
});

const emptyCtx = (currentPath = '/'): Context => ({
  blogs: [],
  learnings: [],
  currentPath,
});

// ── Unit: individual commands ──────────────────────────────────

describe('help', () => {
  it('returns lines', () => {
    const result = runCommand('help', ctx());
    expect(result.type).toBe('lines');
  });

  it('includes all commands', () => {
    const result = runCommand('help', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    const text = result.lines.map(l => l.html).join('\n');
    ['whoami', 'skills', 'contact', 'ls', 'browse', 'cd', 'open', 'clear', 'pwd'].forEach(cmd => {
      expect(text).toContain(cmd);
    });
  });
});

describe('whoami', () => {
  it('returns lines with name', () => {
    const result = runCommand('whoami', ctx());
    expect(result.type).toBe('lines');
    if (result.type !== 'lines') return;
    expect(result.lines[0].html).toContain('Shekhar');
  });
});

describe('skills', () => {
  it('mentions Go', () => {
    const result = runCommand('skills', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines.some(l => l.html.includes('Go'))).toBe(true);
  });
});

describe('pwd', () => {
  it('reflects current path', () => {
    const result = runCommand('pwd', ctx('/blogs/raft-consensus'));
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].html).toBe('/blogs/raft-consensus');
  });

  it('shows / at root', () => {
    const result = runCommand('pwd', ctx('/'));
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].html).toBe('/');
  });
});

describe('ls', () => {
  it('with no args at / lists dirs as text', () => {
    const result = runCommand('ls', ctx('/'));
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines.some(l => l.html.includes('blogs/'))).toBe(true);
    expect(result.lines.some(l => l.html.includes('learnings/'))).toBe(true);
  });

  it('with no args at /blogs shows slugs as text', () => {
    const result = runCommand('ls', ctx('/blogs'));
    expect(result.type).toBe('lines');
    if (result.type !== 'lines') return;
    expect(result.lines[0].html).toBe('raft-consensus');
  });

  it('with no args at /blogs/slug shows slugs as text', () => {
    const result = runCommand('ls', ctx('/blogs/raft-consensus'));
    expect(result.type).toBe('lines');
  });

  it('with no args at /learnings shows slugs as text', () => {
    const result = runCommand('ls', ctx('/learnings'));
    expect(result.type).toBe('lines');
    if (result.type !== 'lines') return;
    expect(result.lines[0].html).toBe('rust-lifetimes');
  });

  it('ls blogs returns plain text lines', () => {
    const result = runCommand('ls blogs', ctx());
    expect(result.type).toBe('lines');
    if (result.type !== 'lines') return;
    expect(result.lines).toHaveLength(BLOGS.length);
    expect(result.lines[0].html).toBe('raft-consensus');
  });

  it('ls /blogs also works', () => {
    const result = runCommand('ls /blogs', ctx());
    expect(result.type).toBe('lines');
  });

  it('ls learnings returns plain text lines', () => {
    const result = runCommand('ls learnings', ctx());
    expect(result.type).toBe('lines');
    if (result.type !== 'lines') return;
    expect(result.lines[0].html).toBe('rust-lifetimes');
  });

  it('shows muted message when no blogs', () => {
    const result = runCommand('ls blogs', emptyCtx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('muted');
  });

  it('returns error for unknown dir', () => {
    const result = runCommand('ls unknown', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });
});

describe('browse', () => {
  it('browse blogs returns select items', () => {
    const result = runCommand('browse blogs', ctx());
    expect(result.type).toBe('select');
    if (result.type !== 'select') return;
    expect(result.items).toHaveLength(BLOGS.length);
    expect(result.items[0].path).toBe('/blogs/raft-consensus');
    expect(result.items[0].external).toBeUndefined();
  });

  it('browse /blogs also works', () => {
    const result = runCommand('browse /blogs', ctx());
    expect(result.type).toBe('select');
  });

  it('browse learnings returns select items', () => {
    const result = runCommand('browse learnings', ctx());
    expect(result.type).toBe('select');
    if (result.type !== 'select') return;
    expect(result.items[0].path).toBe('/learnings/rust-lifetimes');
  });

  it('browse contacts returns external select items', () => {
    const result = runCommand('browse contacts', ctx());
    expect(result.type).toBe('select');
    if (result.type !== 'select') return;
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach(item => expect(item.external).toBe(true));
  });

  it('browse contact (singular) also works', () => {
    const result = runCommand('browse contact', ctx());
    expect(result.type).toBe('select');
  });

  it('browse contacts includes email and github', () => {
    const result = runCommand('browse contacts', ctx());
    if (result.type !== 'select') throw new Error('expected select');
    const paths = result.items.map(i => i.path);
    expect(paths.some(p => p.includes('mailto:'))).toBe(true);
    expect(paths.some(p => p.includes('github'))).toBe(true);
  });

  it('browse with no args returns error', () => {
    const result = runCommand('browse', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });

  it('browse unknown returns error', () => {
    const result = runCommand('browse unknown', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });

  it('browse blogs shows muted message when no blogs', () => {
    const result = runCommand('browse blogs', emptyCtx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('muted');
  });
});

describe('cd', () => {
  it('cd /blogs navigates to /blogs', () => {
    const result = runCommand('cd /blogs', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/blogs' });
  });

  it('cd blogs also works', () => {
    const result = runCommand('cd blogs', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/blogs' });
  });

  it('cd /learnings navigates to /learnings', () => {
    const result = runCommand('cd /learnings', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/learnings' });
  });

  it('cd blogs/raft-consensus navigates to post', () => {
    const result = runCommand('cd blogs/raft-consensus', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/blogs/raft-consensus' });
  });

  it('cd ~ navigates to /', () => {
    const result = runCommand('cd ~', ctx('/blogs'));
    expect(result).toEqual({ type: 'navigate', path: '/' });
  });

  it('cd .. from /blogs goes to /', () => {
    const result = runCommand('cd ..', ctx('/blogs'));
    expect(result).toEqual({ type: 'navigate', path: '/' });
  });

  it('cd .. from /blogs/raft-consensus goes to /blogs', () => {
    const result = runCommand('cd ..', ctx('/blogs/raft-consensus'));
    expect(result).toEqual({ type: 'navigate', path: '/blogs' });
  });

  it('cd .. from / stays at /', () => {
    const result = runCommand('cd ..', ctx('/'));
    expect(result).toEqual({ type: 'navigate', path: '/' });
  });

  it('unknown dir returns error', () => {
    const result = runCommand('cd nonexistent', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });
});

describe('open', () => {
  it('opens a blog by slug', () => {
    const result = runCommand('open raft-consensus', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/blogs/raft-consensus' });
  });

  it('opens a learning by slug', () => {
    const result = runCommand('open rust-lifetimes', ctx());
    expect(result).toEqual({ type: 'navigate', path: '/learnings/rust-lifetimes' });
  });

  it('returns error for unknown slug', () => {
    const result = runCommand('open nonexistent', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });

  it('returns error with no arg', () => {
    const result = runCommand('open', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
  });
});

describe('home', () => {
  it('navigates to /', () => {
    expect(runCommand('home', ctx('/blogs'))).toEqual({ type: 'navigate', path: '/' });
  });
});

describe('clear', () => {
  it('returns clear', () => {
    expect(runCommand('clear', ctx())).toEqual({ type: 'clear' });
  });
});

describe('unknown command', () => {
  it('returns error line', () => {
    const result = runCommand('foobar', ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].modifier).toBe('err');
    expect(result.lines[0].html).toContain('foobar');
  });
});

describe('empty input', () => {
  it('returns empty lines', () => {
    const result = runCommand('', ctx());
    expect(result).toEqual({ type: 'lines', lines: [] });
  });

  it('handles whitespace-only input', () => {
    const result = runCommand('   ', ctx());
    expect(result).toEqual({ type: 'lines', lines: [] });
  });
});

// ── Security: HTML escaping (XSS) ──────────────────────────────

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(escapeHtml(`a&b"c'd`)).toBe('a&amp;b&quot;c&#39;d');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('raft-consensus')).toBe('raft-consensus');
  });
});

describe('html tagged template', () => {
  it('keeps static markup but escapes interpolated values', () => {
    const evil = '<img onerror=alert(1)>';
    expect(html`<span>${evil}</span>`).toBe('<span>&lt;img onerror=alert(1)&gt;</span>');
  });

  it('escapes every interpolation', () => {
    expect(html`${'<'}${'>'}${'&'}`).toBe('&lt;&gt;&amp;');
  });
});

describe('command output never echoes raw HTML', () => {
  const XSS = '<script>alert(1)</script>';

  it('escapes unknown command input', () => {
    const result = runCommand(XSS, ctx());
    if (result.type !== 'lines') throw new Error('expected lines');
    expect(result.lines[0].html).not.toContain('<script>');
    expect(result.lines[0].html).toContain('&lt;script&gt;');
  });

  it('escapes unknown ls/cd/open targets', () => {
    for (const cmd of [`ls ${XSS}`, `cd ${XSS}`, `open ${XSS}`, `browse ${XSS}`]) {
      const result = runCommand(cmd, ctx());
      if (result.type !== 'lines') throw new Error('expected lines');
      expect(result.lines[0].html).not.toContain('<script>');
    }
  });
});

// ── Behaviour: autocomplete ────────────────────────────────────

describe('autocomplete', () => {
  it('completes partial command', () => {
    expect(autocomplete('hel')).toBe('help');
    expect(autocomplete('who')).toBe('whoami');
    expect(autocomplete('brow')).toBe('browse');
    expect(autocomplete('browse b')).toBe('browse blogs');
    expect(autocomplete('browse c')).toBe('browse contacts');
    expect(autocomplete('cd ..')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(autocomplete('')).toBeNull();
  });

  it('returns null when already complete', () => {
    expect(autocomplete('help')).toBeNull();
  });

  it('returns null for no match', () => {
    expect(autocomplete('zzz')).toBeNull();
  });
});
