---
title: Setting Up My Second Brain
date: 2026-06-08
description: How I built my personal site and second brain system using Obsidian, Astro, and Cloudflare Pages — and automated the entire setup into one command.
publish: true
---
I wanted a system where I could write privately, publish selectively, and set it all up on any new machine in one command. Here's what I built.

## The architecture

```
~/brain/           ← local Obsidian vault, private, never pushed to GitHub
      ↓  publish.sh (manual, when ready)
~/code/shekhar/    ← public Astro site on GitHub → auto-deploys to Cloudflare Pages
```

- Notes with `publish: true` in frontmatter get copied to the site
- Everything else stays private forever
- One git push = site deploys

## Stack

- **Obsidian** — writing, free
- **Astro** — static site generator, markdown-native
- **Cloudflare Pages** — hosting, auto-deploys on git push
- **Templater** — Obsidian plugin, auto-fills frontmatter on new notes via folder templates (`blogs/` → blog template, `learnings/` → learning template). Date fills automatically, title you type once.

## Folder structure

```
~/brain/
├── blogs/          ← blog drafts
├── learnings/      ← learning notes
├── templates/
│   ├── blog.md     ← auto-applied when creating in blogs/
│   └── learning.md ← auto-applied when creating in learnings/
└── publish.sh      ← copies publish:true notes to site repo + pushes

~/code/shekhar/
├── src/content/
│   ├── blogs/      ← published posts (copied by publish.sh)
│   └── learnings/  ← published notes (copied by publish.sh)
├── setup.sh        ← one-time machine setup
└── publish.sh      ← source of truth for the publish script
```

## Daily workflow

1. Create a file in `blogs/` or `learnings/`
2. Frontmatter auto-fills — date is today, `publish: false`, title is blank for you to type
3. Write freely — stays private until you say otherwise
4. When ready: change `publish: false` → `publish: true`
5. Run `bash ~/brain/publish.sh` → live in ~30 seconds

## Setting up on a new machine

**Step 1 — Obsidian (manual, one-time):**
1. Download Obsidian from [obsidian.md](https://obsidian.md "preview")
2. Open Obsidian → Settings → Community plugins → disable Safe mode
3. Browse → search "Templater" → Install → Enable
4. Quit Obsidian (`Cmd+Q`)

**Step 2 — everything else (automated):**
```bash
curl -fsSL https://raw.githubusercontent.com/ShekharDhangar/shekhar/main/setup.sh | bash
```

This installs Node.js, clones the site repo, creates the brain folder structure, copies templates, and pre-configures Templater with folder templates.

**Step 3:** Open Obsidian → open `~/brain` as vault → start writing.
