/**
 * Single source of truth for identity — shown to humans (terminal `whoami`/`skills`),
 * search engines, and AI agents (JSON-LD Person schema). Keep prose and lists here so
 * the same facts never drift between the page, the terminal, and structured data.
 */
export const PROFILE = {
  name: 'Shekhar Dhangar',
  jobTitle: 'Software Engineer',
  summary:
    'Software Engineer working on distributed systems, backend infrastructure, ' +
    'and whatever is interesting enough to pull me in.',
} as const;

export const LANGUAGES = ['Go', 'Rust', 'Python', 'TypeScript'] as const;
export const DOMAINS = ['distributed systems', 'databases', 'backend infrastructure'] as const;

/** Topics surfaced as schema.org `knowsAbout` for agents and search. */
export const KNOWS_ABOUT: string[] = [...LANGUAGES, ...DOMAINS];
