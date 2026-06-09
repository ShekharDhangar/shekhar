export type SocialLink = {
  slug: string;
  label: string;
  href: string;
};

/** Single source of truth for contact / social links. */
export const SOCIAL_LINKS: SocialLink[] = [
  { slug: 'email',    label: 'me@shekhardhangar.com',          href: 'mailto:me@shekhardhangar.com' },
  { slug: 'github',   label: 'github.com/shekhardhangar',      href: 'https://github.com/shekhardhangar' },
  { slug: 'twitter',  label: 'twitter.com/shekhargd_',         href: 'https://twitter.com/shekhargd_' },
  { slug: 'linkedin', label: 'linkedin.com/in/shekhardhangar', href: 'https://www.linkedin.com/in/shekhardhangar' },
];

/** Look up a social link's href by slug, failing loudly if it's missing. */
export function linkHref(slug: string): string {
  const link = SOCIAL_LINKS.find((l) => l.slug === slug);
  if (!link) throw new Error(`No social link with slug "${slug}"`);
  return link.href;
}

export const EMAIL_HREF = linkHref('email');
