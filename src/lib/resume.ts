/**
 * Single source of truth for the /resume page. Mirrors the LaTeX resume in
 * ~/code/resume (resume.tex) with the corrections confirmed by Shekhar; when the
 * resume changes, update this file and the page follows.
 */
export type Role = {
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
};

export type SkillGroup = { label: string; items: string };

export const RESUME_PDF = '/shekhardhangar.pdf';

const SETU = { company: 'Setu', location: 'Bengaluru, India' } as const;

export const SUMMARY =
  "I've spent 4+ years at Setu (Pine Labs) building the backend behind payments, settlement, and " +
  "reconciliation on India's payment networks. I like owning systems end-to-end, from the first " +
  "design doc to production, and I care most about them scaling and staying up. Day to day that " +
  'means event-driven Go services on Temporal and SQS, REST APIs, and the odd zero-downtime migration.';

export const EXPERIENCE: Role[] = [
  {
    title: 'Software Development Engineer II',
    ...SETU,
    dates: 'Apr 2026 – Present',
    bullets: [
      'Architected and built, from scratch, a QR metro-ticketing product for a major e-commerce integration (ONDC): authored the full TDD as engineering owner, covering a Temporal-based ticketing flow and an in-house settlement and money-movement engine; load-tested to 100 RPS.',
      "Designed the upstream integration for Setu's cross-border remittance product: order creation, KYC, and callback flows with the remittance provider.",
    ],
  },
  {
    title: 'Software Development Engineer I',
    ...SETU,
    dates: 'Apr 2024 – Mar 2026',
    bullets: [
      'Built settlement automation to replace a manual ops process, then shipped same-day (T+0) settlement on top with direct revenue impact. Cut reconciliation turnaround from 1 hour to 20 minutes.',
      "Built ReconX, Setu's reconciliation engine, 0 to 1, authoring the TDD from onboarding to reporting; an SQS queue with a concurrent Go worker service on AWS Fargate reconciles 200,000–300,000 transactions in under 5 minutes.",
      "Migrated Setu's UPI payment-link and callback flows from a partner bank to our in-house stack with zero downtime, scaling to 5,000–6,000 daily transactions.",
      'Set up Postgres logical replication so read-heavy finance reporting runs off a replica, and partitioned large, high-volume production tables with near-zero downtime, with cost savings of ~US$500/month through archival.',
      "Operated Setu's bill-payments platform as the engineering point of contact for internal teams and customers: owned on-call, incident RCA, and production monitoring; automated alert silencing for known downtime windows, and automated refund-file handling to cut support tickets.",
      "Contributed to Setu's MCP server for agentic bill payments (AI agents fetch and pay bills), owning its security, compliance, and production-readiness work. Separately built a whitelabel WhatsApp bill-payment flow over the Meta API with BSP integration for in-chat fetch-and-pay.",
      "Migrated 2,000+ merchants' API keys from direct Keycloak calls to a new identity service via A/B-tested scripts, keeping both auth stacks live through the cutover; zero downtime.",
      'Cut infra cost by ~10% (~US$400/month) across two clusters by retuning capacity providers, binpacking, and consolidating clusters.',
    ],
  },
  {
    title: 'Software Engineering Intern',
    ...SETU,
    dates: 'Aug 2022 – Mar 2024',
    bullets: [
      "Shipped Setu's API Playground, an in-browser client for Setu's live payment APIs with form & JSON editors.",
      "Built Crucible Icons, the SVG-to-React icon package of Setu's design system, used across all Setu products.",
      'Optimized bill-payment & UPI settlement DB queries, rewriting joins causing full-table scans and adding strategic indexes; settlement queries 35% faster.',
    ],
  },
];

export const SKILLS: SkillGroup[] = [
  { label: 'Languages', items: 'Go (Golang), TypeScript, JavaScript, React, Next.js' },
  { label: 'Databases', items: 'PostgreSQL, Redis' },
  { label: 'Orchestration, Messaging & Auth', items: 'Temporal, SQS, Keycloak' },
  { label: 'Cloud', items: 'AWS' },
  { label: 'Infra & Tooling', items: 'Terraform, GitLab CI, Git, Docker' },
  { label: 'Domains', items: 'Payments, distributed systems, microservices, REST APIs, event-driven & async processing' },
];

export const EDUCATION = {
  school: 'Xavier Institute of Engineering',
  degree: 'Bachelor of Engineering, Information Technology',
  location: 'Mahim, Mumbai',
  dates: '2020 – 2024',
};
