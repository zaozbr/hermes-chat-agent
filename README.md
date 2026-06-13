# Hermes Agent for VS Code

> Full **Cascade-grade** AI coding agent for vanilla VS Code, powered by
> [Hermes Agent](https://hermes-agent.nousresearch.com) via the
> [Agent Client Protocol](https://agentclientprotocol.com) (JSON-RPC 2.0 over stdio).

This extension **does not reimplement** an agent. It consumes the
[Hermes CLI](https://github.com/NousResearch/hermes-agent) running locally
in ACP mode and renders its messages, tool calls, plans, permissions,
terminals, and file diffs directly inside the standard VS Code editor.

| Feature | Status |
|---|---|
| Cascade-style sidebar chat with streaming | ✅ |
| Inline edit (Cmd+I) | ✅ |
| Cascade Flow panel (plan + tools + chat) | ✅ |
| ACP `session/request_permission` dialogs | ✅ |
| Multi-file diffs | ✅ |
| Terminal execution (ACP `terminal/*`) | ✅ |
| Skills picker (`hermes skills list`) | ✅ |
| MCP server manager (`hermes mcp list/enable/disable`) | ✅ |
| Slash commands (TUI parity) | ✅ |
| Session resume / fork / list | ✅ |
| Image + audio + embedded-context attachments | ✅ |
| Onboarding wizard (install Hermes from zero) | ✅ |
| Auto-detection of `hermes` on PATH and in `~/.local/share` | ✅ |
| Cross-platform (Windows / macOS / Linux) | ✅ |
| Plan / todo visualization | ✅ |
| Token usage + cost in status bar | ✅ |
| `AGENTS.md` / `SOUL.md` / `.cursorrules` injection | ✅ |
| YOLO mode toggle | ✅ |
| Cancellation of in-flight prompts | ✅ |

> ⚠ This extension **requires** the Hermes CLI to be installed locally.
> On first activation, if `hermes` is not found, an onboarding wizard
> guides you through the installation.

## Quick start

### 1. Install the extension

From source (this repo):
```bash
npm install
npm run build
npm run package
code --install-extension vscode-hermes-agent-0.1.0.vsix
```

(Soon: install from the Visual Studio Marketplace.)

### 2. Install the Hermes CLI

If you don't have `hermes` yet, the extension will show the **Onboarding**
panel automatically. Or run manually:
```bash
pipx install hermes-agent[acp]
hermes setup model     # pick a provider / model
hermes postinstall     # bootstrap node, ripgrep, ffmpeg
```

### 3. Open the chat

- `Ctrl+L` / `Cmd+L` — open the chat panel
- `Ctrl+Shift+L` / `Cmd+Shift+L` — open the Cascade Flow panel
- `Ctrl+I` / `Cmd+I` — inline edit selected text
- `Ctrl+Alt+N` / `Cmd+Alt+N` — new session

## Architecture

```
┌──────────────────────────┐  JSON-RPC 2.0   ┌────────────────────────┐
│  VS Code (this ext)      │   over stdio    │  hermes acp            │
│  ┌────────────────────┐  │ ◄──────────────► │  (Python, Nous Agent)  │
│  │ Extension Host     │  │                 └────────────────────────┘
│  │ (Node 20, esbuild) │  │                          │
│  │  - ACP client      │  │                          ▼
│  │  - session mgr     │  │                 ┌────────────────────────┐
│  │  - tool exec       │  │                 │  LLMs, MCP, Skills,    │
│  │  - permission UI   │  │                 │  Memory, Tools, ...    │
│  └────────┬───────────┘  │                 └────────────────────────┘
│           │ postMessage  │
│           ▼              │
│  ┌────────────────────┐  │
│  │ Webview (React 18) │  │
│  │  - ChatView        │  │
│  │  - CascadeFlow     │  │
│  │  - Onboarding      │  │
│  │  - ToolCallCard    │  │
│  │  - PlanList        │  │
│  │  - PermissionDlg   │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

## Development

```bash
git clone https://github.com/NousResearch/vscode-hermes-agent
cd vscode-hermes-agent
npm install
npm run dev       # watch mode (extension + webview)
```

Press `F5` in VS Code to launch the Extension Development Host with the
extension loaded.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Watch mode (host + webview) |
| `npm run build` | Production build |
| `npm run typecheck` | TS typecheck (host + webview) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run package` | Produce `.vsix` |

## Configuration

All settings live under `hermes-agent.*` in VS Code settings:

| Setting | Default | Description |
|---|---|---|
| `hermes-agent.path` | `hermes` | Path to the Hermes executable |
| `hermes-agent.args` | `["acp", "--accept-hooks", "--source", "tool"]` | Args for `hermes acp` |
| `hermes-agent.env` | `{}` | Extra env vars (e.g. `HERMES_INFERENCE_MODEL`) |
| `hermes-agent.cwd` | first workspace folder | Working directory for sessions |
| `hermes-agent.mcpServers` | `[]` | MCP servers to pass to `session/new` |
| `hermes-agent.yolo` | `false` | Bypass all command approval prompts |
| `hermes-agent.checkpoints` | `false` | Enable filesystem checkpoints |
| `hermes-agent.maxTurns` | `90` | Max tool-call iterations per turn |
| `hermes-agent.defaultMode` | `code` | Cascade Code vs Chat mode |
| `hermes-agent.statusBar.enabled` | `true` | Show status bar item |

## Slash commands

Open the chat and type `/` to see all slash commands. Mirrors the TUI
commands from `hermes --cli` help:

- `/new` — new session
- `/title <name>` — rename session
- `/compact` — compress context
- `/mode` — toggle Cascade Code / Chat
- `/yolo` — toggle YOLO mode
- `/skills` — load a skill
- `/mcp` — toggle MCP server
- `/model` — pick model
- `/provider` — pick provider
- `/rollback` — restore checkpoint

## License

MIT © Hermes Agent for VS Code contributors
