# Contributing to Hermes Agent for VS Code

Thanks for your interest in making this extension better.

## How to contribute

1. **Issues first** — open an issue describing the bug or feature.
2. **Fork & branch** — `git checkout -b feat/my-feature`.
3. **Code style** — `npm run lint && npm run format`.
4. **Typecheck** — `npm run typecheck` must pass.
5. **Test** — add or update tests in `src/**/*.test.ts` and `webview/**/*.test.tsx`.
6. **Commit** — use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `docs: ...` for documentation
   - `chore: ...` for tooling
7. **PR** — open a pull request and link the issue.

## Local development

```bash
npm install
npm run dev
# in VS Code, press F5 to launch the extension dev host
```

## Architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/HERMES.md](docs/HERMES.md) before making non-trivial changes.

## Mapping Cascade → this extension

See [docs/CASCADE_FEATURES.md](docs/CASCADE_FEATURES.md) for the
feature-by-feature mapping and the test plan.

## Adding a new slash command

1. Add the command to the slash menu in `webview/src/components/SlashMenu.tsx`.
2. Implement the handler in `webview/src/state/store.ts` and
   `src/providers/chatPanelProvider.ts`.
3. If it requires a new Hermes CLI subcommand, document it in
   `docs/HERMES.md`.

## Adding a new ACP capability

1. Check the protocol at <https://agentclientprotocol.com>.
2. Update `src/acp/manager.ts` (`createClient`).
3. Add a service in `src/services/` if it has state.
4. Wire UI in `webview/src/components/`.

## Release

Maintainers run `npm run package` and upload the `.vsix` to the
Visual Studio Marketplace. Tags follow `v<extension-version>`.
