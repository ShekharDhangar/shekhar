# AGENTS.md

## What this project is

Shekhar's personal site and "second brain" — a statically-built Astro site that
publishes Markdown notes written in Obsidian. It has two halves:

- **The site** (this repo, `~/code/shekhar`) — Astro + TypeScript, built to static
  HTML, deployed by Cloudflare Pages on every push to `main`.
- **The vault** (`~/brain`, not in this repo) — an Obsidian vault where notes are
  drafted privately. `publish.sh` copies only notes marked `publish: true` into
  `src/content/`, commits, and pushes. Drafts never enter the repo.

`setup.sh` bootstraps a fresh machine (clones repo, creates the vault, seeds Obsidian +
Templater config). `publish.sh` is the draft→live pipeline and refuses to run on a dirty
repo so a publish commit only ever touches content.

Content is two collections (`src/content.config.ts`): **blogs** and **learnings**, each
Markdown with a small Zod-validated frontmatter schema. Markdown rendering is customized
in `astro.config.mjs` via small zero-dependency rehype/Shiki plugins (lazy images, link
hover-previews, per-block copy buttons).

## Architecture

- `src/pages` — routes. Index, plus `blogs/` and `learnings/` list + `[slug]` detail pages.
- `src/layouts/Layout.astro` — shared shell (head, JSON-LD, client scripts for previews/copy).
- `src/components` — `QuakeTerminal.astro` (interactive terminal UI), `ThemeToggle`, icons.
- `src/lib` — **the testable core. Put logic here, not in `.astro` files.** Plain TS,
  unit-tested with Vitest:
  - `posts.ts` — collection fetching + date formatting
  - `links.ts` — single source of truth for social links; `linkHref` fails loud on a bad slug
  - `profile.ts` — single source of truth for identity (terminal, SEO, JSON-LD all read this)
  - `terminal.ts` — the terminal command engine (pure functions; `terminal.test.ts` covers it)
- `src/content` — Markdown content + the collection schema.

## Content: writing blogs & learnings

Notes are **drafted in `~/brain` (Obsidian), not in this repo.** New notes start from
`templates/` (Templater fills `date`), and only reach `src/content/` when `publish.sh`
copies the ones marked `publish: true`. So:

- **To write or edit prose**, work in the `~/brain` vault. Use the global **`writing-coach`**
  skill before flipping `publish: true` (it coaches the draft; it doesn't write for you).
  Use **`writing-transformer`** only when you explicitly want text rewritten.
- **In this repo**, you mostly touch content to fix a published note or adjust the schema.

Frontmatter contract (validated by the Zod schema in `src/content.config.ts`):

| Field | blogs | learnings | Notes |
|-------|-------|-----------|-------|
| `title` | required | required | string |
| `date` | required | required | `YYYY-MM-DD` (coerced to Date) |
| `description` | optional | — | used for SEO/meta |
| `tags` | — | optional | string array |
| `publish` | — | — | not in the schema; `publish.sh` reads it as the draft→live filter. Defaults to `false` in templates. |

Keep the contract in sync: if you add a frontmatter field, update both `content.config.ts`
(so Astro validates it) and the relevant template in `templates/`.

## Conventions (how code here is written)

- **Single source of truth.** Identity, links, etc. live in one `src/lib` module and every
  consumer reads from it — facts never get duplicated across page, terminal, and structured data.
- **Logic lives in `src/lib` and is unit-tested.** `.astro` files stay thin; testable behavior
  goes in plain TS modules so Vitest can cover it (see `terminal.test.ts`).
- **Fail loud.** Missing/invalid data throws with a clear message (`linkHref`), never silently
  degrades.
- **Security at the HTML boundary.** Untrusted text rendered into `innerHTML` goes through
  `escapeHtml` / the `html\`\`` tagged template in `terminal.ts` — use the tagged template so a
  dynamic value can't be forgotten.
- **Customizations stay portable.** Markdown extras (copy buttons, link previews) are driven by
  optional fence meta / link titles so cross-posting to other renderers degrades gracefully.

## Coding guidelines

Follow the global **`coding-guidelines`** skill for all code you write, edit, or review.
Invoke it before touching code: simple over clever, readable, real error handling, surgical
changes, rule-of-three before abstracting, secure by default.

**This repo enforces a subset of those guidelines mechanically.** `scripts/lint-rules.mjs`
(run by `npm run lint` and the pre-commit hook) is a zero-dependency linter over the TS AST
that **fails the build** on:

- `no-else` — no `else` / `else if`; use early returns / guard clauses
- `nested-if` — `if` nesting deeper than 2 levels
- `nested-loop` — a loop inside another loop
- `too-many-loops` — more than 2 loops in one function
- `swallowed-error` — empty `catch`, or a `catch` that neither logs nor rethrows
  (escape hatch: `// lint:allow-swallow` on the catch line, used deliberately and rarely)
- `duplicate-string` — a long string literal repeated 3+ times (the rule-of-three line)

So the skill's "flatten control flow", "avoid if/else ladders", "no nested loops", "never
swallow errors", and "rule of three" are not optional style here — the linter rejects them.
Write to pass the linter the first time, not by adding escape hatches.

## Commands

- `npm run dev` — local dev server
- `npm run build` — Astro build + Pagefind search index
- `npm run check` — `astro check` (types/diagnostics)
- `npm run lint` — custom lint rules (the guidelines above)
- `npm test` — Vitest once; `npm run test:watch` to watch

## Before you finish

Run `npm run check`, `npm run lint`, and `npm test` — the pre-commit hook runs lint + tests,
so a green local run is what lets a commit through. Don't claim done until all three pass.
Enable the hook once per clone: `git config core.hooksPath .githooks`.
