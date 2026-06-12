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

describe('rehypeCallouts', () => {
  it('renders a basic [!note] callout with no visible type heading', async () => {
    const html = await render('> [!note]\n> hello world');
    expect(html).toContain('class="callout"');
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('hello world');
    expect(html).toContain('<svg'); // icon present
    expect(html).toContain('aria-label="Note"'); // type kept for screen readers only
    expect(html).not.toContain('callout-title'); // no visible "Note" heading
  });

  it('shows a custom title when the author writes one', async () => {
    const html = await render('> [!warning] Watch out\n> body text');
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain('Watch out');
    expect(html).toContain('callout-title'); // custom title is rendered
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
