# AGENTS.md — instructions for AI agents (auto-injected by Hermes)

> This file is automatically loaded by `hermes` (and any other agent that
> follows the convention) as project-level guidance. Edit it to teach
> Hermes how you want it to behave in this repo.

## Project context

- **Name:** (set me)
- **Stack:** (set me)
- **Build / test commands:** (set me)

## Conventions

- Prefer existing libraries; do not add new ones without justification.
- Use snake_case for Python, camelCase for TS, kebab-case for files.
- Keep PRs small (< 300 lines diff when possible).
- Always run tests before declaring done.

## Style

- (your style guide)

## Forbidden

- Do not commit secrets, `.env` files, or `node_modules/`.
- Do not modify generated files.

## Useful commands

\`\`\`sh
# bootstrap
make install

# test
make test

# lint
make lint
\`\`\`
