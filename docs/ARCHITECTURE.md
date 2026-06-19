# Architecture — Hermes Agent for VS Code

> Diagrama e modelo de processo. Esta extension **não** implementa o agente
> — apenas consome o Hermes via **ACP** (JSON-RPC 2.0 sobre stdio).

```
┌────────────────────────────────────────────────────────────────────┐
│                         VS Code (editor)                           │
│                                                                    │
│  ┌──────────────────┐  messages  ┌────────────────────────────┐    │
│  │  Extension Host  │ ◄────────► │  Webview (React + Vite)    │    │
│  │  (Node 20)       │  via       │  - ChatView (Ask/Edit/     │    │
│  │                  │  vscode.   │    Cascade modes)          │    │
│  │  Services:       │  postMsg   │  - ToolCallCard, PlanList  │    │
│  │  - acp/client    │            │  - Onboarding              │    │
│  │  - sessionMgr    │            │  - ModelPicker, McpPicker  │    │
│  │  - toolExec      │            │  - PermissionDialog        │    │
│  │  - hermesDetect  │            └────────────────────────────┘    │
│  │  - workspaceCtx  │                                              │
│  │  - statusBar     │                                              │
│  │                  │  VS Code API (workspace.fs, terminals...)  │
│  │                  │ ◄──────────────────────────────────────►     │
│  └────────┬─────────┘                                              │
│           │                                                        │
└───────────┼────────────────────────────────────────────────────────┘
            │ spawn subprocess (stdio: stdin/stdout/stderr)
            ▼
   ┌─────────────────────────────────────────────┐
   │  hermes acp --accept-hooks --source tool    │
   │  (Python, Hermes Agent v0.15.1)             │
   │                                             │
   │  - AIAgent core                             │
   │  - MCP servers (stdio/http/sse)             │
   │  - Skills                                   │
   │  - Memory providers                         │
   │  - Toolset engine                           │
   │  - Multi-provider routing (Anthropic,       │
   │    OpenAI, OpenRouter, Nous Portal, etc.)   │
   └─────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────┐
   │  External: LLM APIs, MCP servers, browser,  │
   │  tools (Firecrawl, Tavily, GitHub, etc.)    │
   └─────────────────────────────────────────────┘
```

## Componentes da extension

### Extension Host (Node)

| Módulo                                | Responsabilidade                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/extension.ts`                    | `activate()` — registra tudo.                                                                                                  |
| `src/acp/client.ts`                   | Wrapper sobre `ClientSideConnection` (SDK oficial `@agentclientprotocol/sdk`).                                                 |
| `src/acp/handlers.ts`                 | Implementa métodos do lado do cliente (`fs/read_text_file`, `fs/write_text_file`, `terminal/*`, `session/request_permission`). |
| `src/services/hermesDetector.ts`      | Localiza `hermes.exe` / `hermes` no PATH ou em `%LOCALAPPDATA%\hermes\...`.                                                    |
| `src/services/hermesInstaller.ts`     | Guia de instalação quando não encontrado.                                                                                      |
| `src/services/sessionManager.ts`      | Cria/load/resume/fork/close de sessões ACP. Mantém `Map<sessionId, SessionState>`.                                             |
| `src/services/toolExecutor.ts`        | Encaminha tool calls do Hermes para o VS Code (abrir arquivos, diffs, etc.).                                                   |
| `src/services/approvalService.ts`     | UI modal para `session/request_permission`.                                                                                    |
| `src/services/mcpService.ts`          | Wrapper sobre `hermes mcp list/enable/disable/install`.                                                                        |
| `src/services/skillsService.ts`       | Lista skills via `hermes skills list`.                                                                                         |
| `src/services/secretsService.ts`      | Lê `hermes status` para mostrar providers.                                                                                     |
| `src/services/workspaceContext.ts`    | Carrega AGENTS.md / SOUL.md / .cursorrules.                                                                                    |
| `src/providers/chatPanelProvider.ts`  | `WebviewViewProvider` — sidebar chat (Ask/Edit/Cascade).                                                                       |
| `src/providers/onboardingProvider.ts` | Wizard de instalação.                                                                                                          |
| `src/commands/*`                      | Commands do VS Code (Cmd+I, Cmd+L, etc.).                                                                                      |
| `src/ui/statusBar.ts`                 | Status bar item: modelo + status + tokens.                                                                                     |
| `src/ui/notifications.ts`             | Wrapper sobre `vscode.window.showInformation/Error/Warning`.                                                                   |
| `src/utils/logger.ts`                 | OutputChannel.                                                                                                                 |

### Webview (React + Vite)

| Módulo                                        | Responsabilidade                                         |
| --------------------------------------------- | -------------------------------------------------------- |
| `webview/index.html`                          | Host HTML com CSP estrito.                               |
| `webview/src/main.tsx`                        | Entry.                                                   |
| `webview/src/App.tsx`                         | Router entre ChatView / Onboarding.                      |
| `webview/src/components/ChatView.tsx`         | Chat principal: Ask/Edit/Cascade modes.                  |
| `webview/src/components/MessageList.tsx`      | Renderiza user/agent/thought/tool messages.              |
| `webview/src/components/InputBox.tsx`         | Textarea, image attach, mode picker, slash menu, cancel. |
| `webview/src/components/ToolCallCard.tsx`     | Card por tool call com kind, status, content.            |
| `webview/src/components/PlanList.tsx`         | Render `plan` updates como todo list.                    |
| `webview/src/components/PermissionDialog.tsx` | Modal com Allow/Always/Reject.                           |
| `webview/src/components/SessionSwitcher.tsx`  | Lista de sessões.                                        |
| `webview/src/components/ModelPicker.tsx`      | Dropdown de modelos.                                     |
| `webview/src/components/ModePicker.tsx`       | Chat vs Code mode.                                       |
| `webview/src/components/SkillsPicker.tsx`     | Multi-select de skills.                                  |
| `webview/src/components/McpPicker.tsx`        | Lista + enable/disable de MCP servers.                   |
| `webview/src/components/Onboarding.tsx`       | Wizard de install.                                       |
| `webview/src/components/DiffView.tsx`         | Renderiza `diff` content (textarea readonly com cores).  |
| `webview/src/state/store.ts`                  | Estado central (Zustand-like minimalista sem dep).       |
| `webview/src/utils/markdown.ts`               | Renderer de markdown.                                    |
| `webview/src/utils/sanitizer.ts`              | DOMPurify wrap.                                          |

## Fluxo de inicialização

```
activate(context)
  ├─ registerCommands(context)
  ├─ registerProviders(context)        // ChatPanel, CascadePanel, Onboarding
  ├─ statusBar.init()
  ├─ hermesDetector.detect()
  │    ├─ FOUND: spawn acp subprocess, init ACP client
  │    └─ MISSING: open Onboarding panel
  └─ restoreLastSession()              // workspaceState
```

## Fluxo de uma sessão

```
User clica "New Chat" no webview
  → webview postMessage { type: 'session/new', cwd, mcpServers }
  → sessionManager.create(cwd, mcpServers)
      ├─ acpClient.request('session/new', { cwd, mcpServers })
      └─ guarda sessionId

User digita mensagem
  → webview postMessage { type: 'prompt', sessionId, text, images }
  → sessionManager.prompt(sessionId, content)
      ├─ acpClient.request('session/prompt', { sessionId, prompt: content })
      └─ ESPERA por session/update notifications + final result
          ├─ notification.session/update → encaminha ao webview
          ├─ notification.session/request_permission → modal
          ├─ tool_call(edit) → diff inline
          ├─ tool_call(execute) → terminal.create
          └─ final result.stopReason → atualiza UI

User cancela
  → webview postMessage { type: 'cancel', sessionId }
  → sessionManager.cancel(sessionId)
      └─ acpClient.sendNotification('session/cancel', { sessionId })
```

## Modelo de segurança

- Webview roda com **CSP estrita** (`default-src 'self'; img-src 'self' data: vscode-resource:; script-src 'self'`)
- **Sem** inline scripts.
- DOMPurify em todo markdown renderizado.
- `acquireVsCodeApi()` único bridge.
- Approval prompts exigem decisão humana explícita.
- `--yolo` é opt-in (botão no settings).
- Segredos ficam em `~/.hermes/.env` e em VS Code SecretStorage; nunca no
  webview.

## Build / dev

- `pnpm dev` → esbuild watch (host) + vite dev (webview) com HMR.
- `pnpm build` → produção.
- `pnpm package` → `vsce package` para gerar `.vsix`.
- `pnpm lint` → eslint.
- `pnpm test` → vitest.

## Versioning

- `package.json` `version` = versão da extension.
- Compat testada com `hermes-agent[acp]>=0.15.0,<0.16.0` (Pin minor).
- ACP `protocolVersion: 1` (estável).
