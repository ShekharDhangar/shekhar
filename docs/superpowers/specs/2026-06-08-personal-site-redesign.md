# Personal Site Redesign — Design Spec
Date: 2026-06-08

## Overview

Rebuild shekhar.dev as a lightweight, minimal personal site using Astro with plain CSS. No UI libraries, no animations, no JavaScript except a single theme-toggle script. Aesthetic inspired by karthihegde.dev — monospace font, dashed borders, pure black/white.

---

## Stack

- **Astro** — static output (`output: 'static'`). Remove the Node adapter and `@astrojs/node` entirely.
- **Plain CSS** — one global `src/styles/global.css` file. Remove Tailwind (`@astrojs/tailwind`, `tailwindcss`, `@tailwindcss/typography`, `postcss.config.js`, `tailwind.config.mjs`).
- **No UI library** — zero React, zero component frameworks.
- **Font** — Source Code Pro via Google Fonts (same as karthihegde.dev). Fallback: `monospace`.
- **JS** — one inline `<script>` in `<head>` for theme toggle only (~10 lines).
- **Content** — Astro content collections for blogs and learnings (already set up, keep as-is).

---

## Layout

### Desktop (≥ 768px)

```
┌──────────────────────────────────────────────────────┐
│  sidebar (160px, fixed, full height, non-scrollable) │  main content (centered, max-width 680px)
│                                                      │
│  shekhar                                             │  [toggle]
│                                                      │
│  /home                                               │  Hi!
│  /blogs                                              │  ─────────────────────────────
│  /learnings                                          │  I'm Shekhar...
│                                                      │
│  (bottom: nothing)                                   │  Blogs
│                                                      │  ─────────────────────────────
│                                                      │  • Post title       Jun 1, 2026
└──────────────────────────────────────────────────────┘
```

- Sidebar: `position: fixed`, `top: 0`, `left: 0`, `height: 100vh`, `width: 160px`, right border `1px dashed var(--border)`, `overflow: hidden`.
- Name at top, nav links below with `/` prefix. No decorative elements.
- Content area: `margin-left: 160px`, inner div `max-width: 680px`, `padding: 48px 40px`.
- Theme toggle: positioned top-right of the content area, text button (`○` / `●`).

### Mobile (< 768px)

```
┌────────────────────────────────────────┐
│  shekhar          /blogs /learnings ○  │  ← dashed border bottom
├────────────────────────────────────────┤
│                                        │
│  Hi!                                   │
│  ──────────────────────────────────    │
│  I'm Shekhar...                        │
│                                        │
└────────────────────────────────────────┘
```

- Sidebar hidden (`display: none`).
- Top bar: `display: flex`, `justify-content: space-between`, `align-items: center`, `padding: 12px 20px`, `border-bottom: 1px dashed var(--border)`.
- Name left, nav links + theme toggle right (inline, space-separated).
- Content area: `padding: 32px 20px`, no max-width constraint beyond the viewport.

---

## Theme System

```css
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
```

- `data-theme` attribute set on `<html>`.
- Inline `<script>` in `<head>` reads `localStorage.getItem('theme')` on page load and sets it before first paint (prevents flash).
- Toggle button: clicking flips `data-theme` between `dark` and `light`, saves to `localStorage`. Shows `○` in dark mode, `●` in light mode.
- Default: dark.

---

## Home Page Content

Sections in order:

1. **Intro** — 1–2 paragraphs about Shekhar. No heading, just text.
2. **Blogs** — heading `Blogs`, dashed `<hr>`, list of latest 5 posts. Each item: bullet `•` + title (link) left + date right + optional description below.
3. **Learnings** — same structure as Blogs.

Each section separated by `margin-bottom: 56px`. Dashed `<hr>` below each section heading.

---

## Typography

- Font: `"Source Code Pro", monospace`
- Base size: `16px`
- Line height: `1.7`
- Headings (`h1`, `h2`): `font-weight: 800`, `font-size: 20px`, same font
- Muted text (dates, descriptions): `color: var(--muted)`
- Links: `color: var(--fg)`, `text-decoration: none`, underline on hover

---

## File Structure Changes

**Remove:**
- `tailwind.config.mjs`
- `postcss.config.js` (if present)
- All Tailwind class usage from `.astro` files

**Add:**
- `src/styles/global.css` — all global styles

**Modify:**
- `astro.config.mjs` — remove Node adapter and Tailwind integration, set `output: 'static'`
- `package.json` — remove `@astrojs/node`, `@astrojs/tailwind`, `tailwindcss`, `@tailwindcss/typography`
- `src/layouts/Layout.astro` — new layout with sidebar/top-bar, theme toggle, font import
- `src/pages/index.astro` — updated home page using new layout and styles

**Keep unchanged:**
- `src/content/config.ts`
- `src/pages/blogs/` and `src/pages/learnings/` (structure stays, just remove Tailwind classes)

---

## Out of Scope

- Blog post detail page styling (can be addressed separately)
- Social links / footer icons (can be added later)
- Any animation or transition
- Any JavaScript beyond the theme toggle
