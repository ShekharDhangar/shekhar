# Personal Site Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Tailwind + Node adapter with plain CSS, rebuild Layout.astro as sidebar-on-desktop / top-bar-on-mobile, add dark/light theme toggle.

**Architecture:** Astro static site with one `global.css` imported into the layout via frontmatter. Layout.astro handles all chrome. Page files contain only content markup, no Tailwind classes.

**Tech Stack:** Astro 4 (static output), plain CSS with custom properties, Source Code Pro via Google Fonts.

---

## File Map

**Created:**
- `src/styles/global.css` — all styles: CSS variables, base reset, sidebar, top bar, content area, post list, prose

**Modified:**
- `astro.config.mjs` — remove Node adapter + Tailwind, set `output: 'static'`
- `package.json` — remove `@astrojs/node`, `@astrojs/tailwind`, `tailwindcss`, `@tailwindcss/typography`
- `src/layouts/Layout.astro` — full rewrite: imports global.css, renders sidebar + top bar + theme toggle
- `src/pages/index.astro` — strip Tailwind classes, use semantic CSS class names
- `src/pages/blogs/index.astro` — same
- `src/pages/learnings/index.astro` — same
- `src/pages/blogs/[slug].astro` — strip Tailwind, wrap content in `.prose`
- `src/pages/learnings/[slug].astro` — strip Tailwind, wrap content in `.prose`

**Deleted:**
- `tailwind.config.mjs`

---

## Task 1: Strip Tailwind and Node Adapter

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json`
- Delete: `tailwind.config.mjs`

- [ ] **Step 1: Replace astro.config.mjs**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
});
```

- [ ] **Step 2: Update package.json — remove four dependencies**

Open `package.json`. The `dependencies` block currently has `@astrojs/node`, `@astrojs/tailwind`, `tailwindcss`, and `@tailwindcss/typography`. Remove those four entries. The result:

```json
"dependencies": {
  "astro": "^4.11.0"
}
```

- [ ] **Step 3: Delete tailwind.config.mjs and run install**

```bash
rm /Users/shekhardhangar/code/shekhar/tailwind.config.mjs
cd /Users/shekhardhangar/code/shekhar && npm install
```

Expected: clean install with only astro in node_modules top level.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json package-lock.json
git rm tailwind.config.mjs
git commit -m "chore: remove tailwind and node adapter, switch to static output"
```

---

## Task 2: Create global.css

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Create src/styles/global.css**

```css
/* ── Theme variables ──────────────────────────────── */
:root {
  --bg: #000;
  --fg: #fff;
  --muted: #666;
  --border: #444;
}

[data-theme="light"] {
  --bg: #fff;
  --fg: #000;
  --muted: #999;
  --border: #ccc;
}

/* ── Base reset ───────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: "Source Code Pro", monospace;
  line-height: 1.7;
  min-height: 100vh;
}

a {
  color: var(--fg);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

hr {
  border: none;
  border-top: 1px dashed var(--border);
}

/* ── Sidebar (desktop only) ───────────────────────── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 160px;
  border-right: 1px dashed var(--border);
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-name {
  font-weight: 800;
  margin-bottom: 32px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-nav a {
  color: var(--muted);
  font-size: 14px;
}

.sidebar-nav a:hover {
  color: var(--fg);
  text-decoration: none;
}

/* ── Top bar (mobile only) ────────────────────────── */
.topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px dashed var(--border);
}

.topbar-name {
  font-weight: 800;
  font-size: 14px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.topbar-right a {
  color: var(--muted);
}

.topbar-right a:hover {
  color: var(--fg);
  text-decoration: none;
}

/* ── Content area ─────────────────────────────────── */
.content-wrap {
  margin-left: 160px;
}

.content {
  max-width: 680px;
  padding: 48px 40px;
  position: relative;
}

/* ── Theme toggle ─────────────────────────────────── */
.theme-toggle {
  background: none;
  border: none;
  color: var(--muted);
  font-family: inherit;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.theme-toggle:hover {
  color: var(--fg);
}

/* Desktop: toggle floats top-right of content */
.content .theme-toggle {
  position: absolute;
  top: 48px;
  right: 40px;
}

/* ── Typography ───────────────────────────────────── */
h1, h2, h3 {
  font-weight: 800;
  font-size: 20px;
  line-height: 1.3;
}

/* ── Home page sections ───────────────────────────── */
.section {
  margin-bottom: 56px;
}

.section-heading {
  margin-bottom: 12px;
}

.section-divider {
  margin-bottom: 24px;
}

/* ── Post list ────────────────────────────────────── */
.post-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-item {
  display: flex;
  gap: 12px;
}

.post-bullet {
  color: var(--muted);
  flex-shrink: 0;
  margin-top: 2px;
}

.post-body {
  flex: 1;
  min-width: 0;
}

.post-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.post-title {
  font-weight: 800;
}

.post-date {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.post-desc {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

.empty-state {
  color: var(--muted);
}

/* ── Article detail ───────────────────────────────── */
.back-link {
  color: var(--muted);
  font-size: 13px;
  display: block;
  margin-bottom: 32px;
}

.back-link:hover {
  color: var(--fg);
  text-decoration: none;
}

.post-meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}

/* ── Prose (rendered markdown) ────────────────────── */
.prose {
  line-height: 1.8;
}

.prose p {
  margin-bottom: 20px;
}

.prose h1,
.prose h2,
.prose h3,
.prose h4 {
  font-weight: 800;
  margin-top: 40px;
  margin-bottom: 12px;
}

.prose h1 { font-size: 22px; }
.prose h2 { font-size: 20px; }
.prose h3 { font-size: 17px; }
.prose h4 { font-size: 15px; }

.prose ul,
.prose ol {
  padding-left: 20px;
  margin-bottom: 20px;
}

.prose li {
  margin-bottom: 6px;
}

.prose code {
  font-family: "Source Code Pro", monospace;
  font-size: 13px;
  background: color-mix(in srgb, var(--fg) 8%, transparent);
  padding: 2px 5px;
}

.prose pre {
  background: color-mix(in srgb, var(--fg) 5%, transparent);
  border: 1px dashed var(--border);
  padding: 20px;
  overflow-x: auto;
  margin-bottom: 20px;
}

.prose pre code {
  background: none;
  padding: 0;
  font-size: 13px;
}

.prose blockquote {
  border-left: 2px solid var(--border);
  padding-left: 16px;
  color: var(--muted);
  margin-bottom: 20px;
}

.prose a {
  text-decoration: underline;
}

.prose hr {
  margin: 32px 0;
}

.prose img {
  max-width: 100%;
}

/* ── Mobile ───────────────────────────────────────── */
@media (max-width: 767px) {
  .sidebar {
    display: none;
  }

  .topbar {
    display: flex;
  }

  .content-wrap {
    margin-left: 0;
  }

  .content {
    padding: 32px 20px;
    max-width: 100%;
  }

  /* Hide the desktop toggle in the content area on mobile */
  .content .theme-toggle {
    display: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add global CSS with theme variables, layout, and prose styles"
```

---

## Task 3: Rewrite Layout.astro

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Replace the entire file**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}
const { title, description = 'Shekhar Dhangar — Software Engineer' } = Astro.props;
---

<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;800&display=swap"
      rel="stylesheet"
    />
    <script is:inline>
      const saved = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
    </script>
  </head>
  <body>
    <aside class="sidebar">
      <a href="/" class="sidebar-name">shekhar</a>
      <nav class="sidebar-nav">
        <a href="/">/home</a>
        <a href="/blogs">/blogs</a>
        <a href="/learnings">/learnings</a>
      </nav>
    </aside>

    <header class="topbar">
      <a href="/" class="topbar-name">shekhar</a>
      <div class="topbar-right">
        <a href="/blogs">/blogs</a>
        <a href="/learnings">/learnings</a>
        <button class="theme-toggle" aria-label="Toggle theme">○</button>
      </div>
    </header>

    <div class="content-wrap">
      <main class="content">
        <button class="theme-toggle" aria-label="Toggle theme">○</button>
        <slot />
      </main>
    </div>

    <script is:inline>
      (function () {
        function applyTheme(theme) {
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('theme', theme);
          var icon = theme === 'dark' ? '○' : '●';
          document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.textContent = icon;
          });
        }

        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        var icon = current === 'dark' ? '○' : '●';
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
          btn.textContent = icon;
          btn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
          });
        });
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Build to verify layout compiles**

```bash
cd /Users/shekhardhangar/code/shekhar && npm run build 2>&1 | tail -15
```

Expected: build succeeds or shows only warnings about page files still using Tailwind class names (those are harmless at this stage — they render as unknown class strings, not errors).

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: rewrite layout with sidebar, top bar, and theme toggle"
```

---

## Task 4: Rewrite index.astro

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the entire file**

```astro
---
export const prerender = true;
import Layout from '../layouts/Layout.astro';
import { getCollection } from 'astro:content';

const blogs = (await getCollection('blogs'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 5);

const learnings = (await getCollection('learnings'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 5);

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
---

<Layout title="Shekhar Dhangar">
  <div class="section">
    <p>
      I'm Shekhar Dhangar, a Software Engineer. I work on distributed systems, backend
      infrastructure, and occasionally venture into whatever is interesting enough to pull me in.
    </p>
    <br />
    <p>
      This site is my public second brain — blogs when I have something to say, learnings when
      I'm figuring something out.
    </p>
  </div>

  <div class="section">
    <h2 class="section-heading">Blogs</h2>
    <hr class="section-divider" />
    {blogs.length === 0 ? (
      <p class="empty-state">Nothing yet.</p>
    ) : (
      <ul class="post-list">
        {blogs.map((post) => (
          <li class="post-item">
            <span class="post-bullet">•</span>
            <div class="post-body">
              <div class="post-row">
                <a href={`/blogs/${post.slug}`} class="post-title">{post.data.title}</a>
                <span class="post-date">{fmt(post.data.date)}</span>
              </div>
              {post.data.description && (
                <p class="post-desc">{post.data.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>

  <div class="section">
    <h2 class="section-heading">Learnings</h2>
    <hr class="section-divider" />
    {learnings.length === 0 ? (
      <p class="empty-state">Nothing yet.</p>
    ) : (
      <ul class="post-list">
        {learnings.map((note) => (
          <li class="post-item">
            <span class="post-bullet">•</span>
            <div class="post-body">
              <div class="post-row">
                <a href={`/learnings/${note.slug}`} class="post-title">{note.data.title}</a>
                <span class="post-date">{fmt(note.data.date)}</span>
              </div>
              {note.data.tags && note.data.tags.length > 0 && (
                <p class="post-desc">{note.data.tags.map((t) => `#${t}`).join(' ')}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
</Layout>
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/shekhardhangar/code/shekhar && npm run build 2>&1 | tail -10
```

Expected: no Astro compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: rewrite home page with plain CSS classes"
```

---

## Task 5: Update blogs and learnings list pages

**Files:**
- Modify: `src/pages/blogs/index.astro`
- Modify: `src/pages/learnings/index.astro`

- [ ] **Step 1: Replace blogs/index.astro**

```astro
---
export const prerender = true;
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blogs')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
---

<Layout title="Blogs — Shekhar">
  <div class="section">
    <h1 class="section-heading">Blogs</h1>
    <hr class="section-divider" />
    {posts.length === 0 ? (
      <p class="empty-state">Nothing here yet.</p>
    ) : (
      <ul class="post-list">
        {posts.map((post) => (
          <li class="post-item">
            <span class="post-bullet">•</span>
            <div class="post-body">
              <div class="post-row">
                <a href={`/blogs/${post.slug}`} class="post-title">{post.data.title}</a>
                <span class="post-date">{fmt(post.data.date)}</span>
              </div>
              {post.data.description && (
                <p class="post-desc">{post.data.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
</Layout>
```

- [ ] **Step 2: Replace learnings/index.astro**

```astro
---
export const prerender = true;
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

const notes = (await getCollection('learnings')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
---

<Layout title="Learnings — Shekhar">
  <div class="section">
    <h1 class="section-heading">Learnings</h1>
    <hr class="section-divider" />
    {notes.length === 0 ? (
      <p class="empty-state">Nothing here yet.</p>
    ) : (
      <ul class="post-list">
        {notes.map((note) => (
          <li class="post-item">
            <span class="post-bullet">•</span>
            <div class="post-body">
              <div class="post-row">
                <a href={`/learnings/${note.slug}`} class="post-title">{note.data.title}</a>
                <span class="post-date">{fmt(note.data.date)}</span>
              </div>
              {note.data.tags && note.data.tags.length > 0 && (
                <p class="post-desc">{note.data.tags.map((t) => `#${t}`).join(' ')}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
</Layout>
```

- [ ] **Step 3: Build to verify**

```bash
cd /Users/shekhardhangar/code/shekhar && npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/blogs/index.astro src/pages/learnings/index.astro
git commit -m "feat: update blog and learnings list pages to plain CSS"
```

---

## Task 6: Update detail pages

**Files:**
- Modify: `src/pages/blogs/[slug].astro`
- Modify: `src/pages/learnings/[slug].astro`

- [ ] **Step 1: Replace blogs/[slug].astro**

```astro
---
export const prerender = true;
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blogs');
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await post.render();
const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
---

<Layout title={`${post.data.title} — Shekhar`} description={post.data.description}>
  <a href="/blogs" class="back-link">← blogs</a>
  <h1 class="section-heading" style="margin-bottom: 8px;">{post.data.title}</h1>
  <p class="post-meta">{fmt(post.data.date)}</p>
  <hr class="section-divider" />
  <article class="prose">
    <Content />
  </article>
</Layout>
```

- [ ] **Step 2: Replace learnings/[slug].astro**

```astro
---
export const prerender = true;
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const notes = await getCollection('learnings');
  return notes.map((note) => ({ params: { slug: note.slug }, props: { note } }));
}

const { note } = Astro.props;
const { Content } = await note.render();
const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
---

<Layout title={`${note.data.title} — Shekhar`}>
  <a href="/learnings" class="back-link">← learnings</a>
  <h1 class="section-heading" style="margin-bottom: 8px;">{note.data.title}</h1>
  <div class="post-meta">
    <span>{fmt(note.data.date)}</span>
    {note.data.tags && note.data.tags.length > 0 && (
      <span> · {note.data.tags.map((t) => `#${t}`).join(' ')}</span>
    )}
  </div>
  <hr class="section-divider" />
  <article class="prose">
    <Content />
  </article>
</Layout>
```

- [ ] **Step 3: Full clean build**

```bash
cd /Users/shekhardhangar/code/shekhar && npm run build 2>&1
```

Expected: clean build with zero errors. Output in `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/blogs/[slug].astro src/pages/learnings/[slug].astro
git commit -m "feat: update detail pages to use plain CSS prose styles"
```

---

## Task 7: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd /Users/shekhardhangar/code/shekhar && npm run dev
```

- [ ] **Step 2: Verify at http://localhost:4321**

Check all of the following:
- Dark background, white monospace text, Source Code Pro font loaded
- Fixed left sidebar visible at desktop width (> 768px): "shekhar" name, `/home`, `/blogs`, `/learnings` links in muted colour
- Theme toggle `○` visible top-right of content area on desktop
- Resizing below 768px: sidebar disappears, top bar appears (name left, links + toggle right)
- Clicking `○` switches to white background / black text (`●`), persists on page reload
- Home page: intro paragraphs, "Blogs" heading + dashed line, "Learnings" heading + dashed line
- `/blogs` and `/learnings` routes render the list pages without errors
- No visible Tailwind class name strings rendered as text in the UI

- [ ] **Step 3: Commit any fixups**

If step 2 revealed issues, fix them and commit:

```bash
git add -p
git commit -m "fix: smoketest fixups"
```

Only create this commit if changes were needed.
