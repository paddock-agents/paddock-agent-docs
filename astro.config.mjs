// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// Defaults fit a project site at https://paddock-agents.github.io/paddock-agent-docs/.
// For a custom domain: DOCS_SITE=https://docs.example.com DOCS_BASE=/ plus public/CNAME.
const site = process.env.DOCS_SITE ?? 'https://paddock-agents.github.io';
const base = process.env.DOCS_BASE ?? '/paddock-agent-docs';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [
    // Must come before Starlight so ```mermaid fences are picked up.
    mermaid({ autoTheme: true }),
    starlight({
      title: 'Paddock Agents',
      description:
        'Agents for the software delivery line: Pit Crew builds the pull request, Pit Wall reviews it.',
            favicon: '/favicon.svg',
      customCss: ['./src/styles/theme.css'],
      lastUpdated: true,
      social: [{ icon: 'github', label: 'Paddock Agents on GitHub', href: 'https://github.com/paddock-agents' }],
      sidebar: [
        { label: 'Paddock Agents', link: '/' },
        { label: 'Use them together', slug: 'together' },
        {
          label: 'Pit Crew',
          items: [
            { label: 'Introduction', slug: 'pit-crew' },
            {
              label: 'Why',
              items: [{ label: 'Why it changes the job', slug: 'pit-crew/how-it-works/why' }],
            },
            {
              label: 'How you work',
              items: [
                { label: 'The two gates', slug: 'pit-crew/how-it-works/your-two-gates' },
                { label: 'Plan: the phase you drive', slug: 'pit-crew/how-it-works/plan' },
                { label: 'Lanes', slug: 'pit-crew/how-it-works/lanes' },
                { label: 'Bug triage', slug: 'pit-crew/how-it-works/triage' },
                { label: 'Product mode', slug: 'pit-crew/how-it-works/product-mode' },
                { label: 'Brainstorm', slug: 'pit-crew/how-it-works/brainstorm' },
                { label: 'Your first run', slug: 'pit-crew/getting-started/first-run' },
                { label: 'A worked example', slug: 'pit-crew/getting-started/worked-example' },
              ],
            },
            {
              label: 'What the agents do',
              items: [
                { label: 'From Gate 1c to green PRs', slug: 'pit-crew/how-it-works/what-the-agents-do' },
                { label: 'The flow', slug: 'pit-crew/how-it-works/the-flow' },
                { label: 'Dev', slug: 'pit-crew/how-it-works/dev' },
                { label: 'Test', slug: 'pit-crew/how-it-works/test' },
                { label: 'Deploy (you start it)', slug: 'pit-crew/how-it-works/deploy' },
              ],
            },
            {
              label: 'Guarantees',
              items: [
                { label: 'Why you can trust a run', slug: 'pit-crew/how-it-works/guarantees' },
                { label: 'Evidence and PRs', slug: 'pit-crew/how-it-works/evidence-and-prs' },
                { label: 'Guardrails', slug: 'pit-crew/how-it-works/guardrails' },
                { label: 'State and reports', slug: 'pit-crew/how-it-works/state-and-reports' },
              ],
            },
            {
              label: 'Portable core and connectors',
              items: [
                { label: 'Connect your tools', slug: 'pit-crew/getting-started/connect-your-tools' },
                { label: 'Roles and bindings', slug: 'pit-crew/roles' },
                {
                  label: 'The nine roles',
                  collapsed: true,
                  items: [
                    { label: 'tracker', slug: 'pit-crew/roles/tracker' },
                    { label: 'docs', slug: 'pit-crew/roles/docs' },
                    { label: 'env', slug: 'pit-crew/roles/env' },
                    { label: 'logs', slug: 'pit-crew/roles/logs' },
                    { label: 'data', slug: 'pit-crew/roles/data' },
                    { label: 'review', slug: 'pit-crew/roles/review' },
                    { label: 'deploy', slug: 'pit-crew/roles/deploy' },
                    { label: 'events', slug: 'pit-crew/roles/events' },
                    { label: 'stack', slug: 'pit-crew/roles/stack' },
                  ],
                },
                { label: 'Write an adapter', slug: 'pit-crew/roles/write-an-adapter' },
                { label: 'Telemetry', slug: 'pit-crew/roles/telemetry' },
                { label: 'What a pack is', slug: 'pit-crew/packs' },
                { label: 'Write a pack', slug: 'pit-crew/packs/write-a-pack' },
                { label: 'Open core design', slug: 'pit-crew/packs/open-core-design' },
              ],
            },
            {
              label: 'Install',
              items: [
                { label: 'Install', slug: 'pit-crew/getting-started/install' },
                { label: 'Setup and health check', slug: 'pit-crew/getting-started/setup' },
                { label: 'Videos', slug: 'pit-crew/getting-started/videos' },
              ],
            },
            {
              label: 'Reference',
              collapsed: true,
              items: [
                { label: 'Commands', slug: 'pit-crew/reference/commands' },
                { label: 'Skills', slug: 'pit-crew/reference/skills' },
                { label: 'Agents', slug: 'pit-crew/reference/agents' },
                { label: 'Hooks', slug: 'pit-crew/reference/hooks' },
                { label: 'Environment', slug: 'pit-crew/reference/environment' },
                { label: 'Glossary', slug: 'pit-crew/reference/glossary' },
              ],
            },
          ],
        },
        {
          label: 'Pit Wall',
          collapsed: true,
          items: [
            { label: 'Introduction', slug: 'pit-wall' },
            { label: 'How it works', slug: 'pit-wall/how-it-works' },
            { label: 'Install the GitHub App', slug: 'pit-wall/github-app' },
            { label: 'Configuration', slug: 'pit-wall/configuration' },
            { label: 'Rule packs', slug: 'pit-wall/rule-packs' },
            { label: 'Deploy on Railway', slug: 'pit-wall/deploy-railway' },
            { label: 'Local development', slug: 'pit-wall/local-development' },
            { label: 'Evaluation', slug: 'pit-wall/evaluation' },
            { label: 'Security', slug: 'pit-wall/security' },
            { label: 'Glossary', slug: 'pit-wall/glossary' },
            {
              label: 'Decisions',
              collapsed: true,
              items: [
                { label: 'All decisions', slug: 'pit-wall/decisions' },
                { label: '0001 Initial architecture', slug: 'pit-wall/decisions/2026-11-19-initial-architecture' },
                { label: '0002 Queue in Postgres', slug: 'pit-wall/decisions/2026-11-19-queue-in-postgres-pg-boss' },
                { label: '0003 Two processes on Railway', slug: 'pit-wall/decisions/2026-11-19-railway-two-processes' },
                { label: '0004 Messages API, no strict output', slug: 'pit-wall/decisions/2026-11-19-messages-api-no-strict-output' },
                { label: '0005 One LLM provider first', slug: 'pit-wall/decisions/2026-11-19-llm-provider-anthropic-only' },
                { label: '0006 Head checkout, confined tools', slug: 'pit-wall/decisions/2026-11-19-head-checkout-confined-tools' },
                { label: '0007 Rule packs as data', slug: 'pit-wall/decisions/2026-11-19-rule-packs-as-data' },
                { label: '0008 Dedupe and publish order', slug: 'pit-wall/decisions/2026-11-19-dedupe-persist-publish-mark' },
                { label: '0009 Incremental review', slug: 'pit-wall/decisions/2026-11-19-incremental-review-semantics' },
                { label: '0010 Manual trigger by comment', slug: 'pit-wall/decisions/2026-11-19-manual-trigger-pr-comment' },
                { label: '0011 Evaluation harness', slug: 'pit-wall/decisions/2026-11-19-evaluation-harness' },
              ],
            },
          ],
        },
      ],
    }),
  ],
});
