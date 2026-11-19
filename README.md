# paddock-agent-docs

The documentation site of Paddock Agents, built with Astro Starlight. It covers each agent of the family in its own section:

- **Pit Crew**, a four-phase feature delivery pipeline for Claude Code: [`paddock-agents/pit-crew`](https://github.com/paddock-agents/pit-crew).
- **Pit Wall**, agentic code review for GitHub pull requests: [`pit-wall`](https://github.com/gvareika1997/pit-wall).

**Site, once the repository is public:** https://paddock-agents.github.io/paddock-agent-docs/

## Run it locally

Needs Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:4321/paddock-agent-docs/
```

```bash
npm run build      # writes dist/, then runs scripts/check.mjs
npm run preview    # serves dist/ at http://localhost:4321/paddock-agent-docs/
```

## What is here

| Section | Folder under `src/content/docs/` | Source |
|---|---|---|
| Home | `index.mdx` | written here |
| Use them together | `together.mdx` | Pit Crew's `review` role and Pit Wall's GitHub App |
| Pit Crew | `pit-crew/` | the pit-crew repository: `README.md`, `plugins/pit-crew/` (commands, skills, adapters, hooks), `docs/`, `examples/pack-minimal/` |
| Pit Crew reference | `pit-crew/reference/` | generated, see below |
| Pit Wall | `pit-wall/` | the pit-wall repository: `README.md`, `docs/*.md`, `docs/decisions/`, `CONTEXT.md` |

Every claim comes from those repositories: when one of their files changes, change the page.

## Add an agent

Each agent gets one folder under `src/content/docs/<agent>/` with an `index.mdx`, one sidebar group in `astro.config.mjs`, and one card on the home page. Put its artwork in `src/assets/`.

## Generated reference

`pit-crew/reference/commands.mdx`, `skills.mdx`, `agents.mdx`, `hooks.mdx` and `glossary.mdx` are generated from the frontmatter of Pit Crew's commands, skills and agents, from `hooks/hooks.json` and from `CONTEXT.md`. Do not edit them by hand.

```bash
npm run reference -- /path/to/pit-crew
```

The script holds the curated lists: one line per command, one line per skill, and the glossary terms a user meets. It fails when a command or a skill has no line, or when a glossary term is gone from `CONTEXT.md`: add or fix the entry in `scripts/gen-reference.mjs`. The output is committed, because this repository does not contain the plugin source.

## Build guards

`npm run build` fails when:

- an internal link, image or video does not resolve;
- a page is missing from the sidebar, or a sidebar entry has no page;
- a file contains a banned term. The docs name roles, never one company's tools. The terms are one regex per line in `.docs-banned` (git-ignored) or in the `DOCS_BANNED` variable. With neither, this guard is skipped.

## Videos

`public/video/` holds the two Pit Crew videos as 720p MP4 files with a poster each. They are rendered from the HyperFrames projects with `npx hyperframes render`, then scaled down with ffmpeg. `src/components/Video.astro` embeds one by name.

## Publish

`.github/workflows/deploy.yml` builds on every push and pull request. It deploys to GitHub Pages on a push to `main` only while the repository is public: GitHub Pages needs a public repository on the free plan. After making it public, set **Settings → Pages → Source** to **GitHub Actions** once.

The site URL defaults to `https://paddock-agents.github.io/paddock-agent-docs/`. For a custom domain, set `DOCS_SITE` and `DOCS_BASE` in the build step (`astro.config.mjs` and `scripts/check.mjs` read them) and add `public/CNAME`.

## License

Apache-2.0. The artwork in `src/assets/` comes from the pit-crew and pit-wall repositories.
