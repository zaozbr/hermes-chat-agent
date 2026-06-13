# Cascade (Windsurf) → Mapping para esta extension

> Mapeamento de **cada feature do Cascade** (agente da Windsurf/Codeium) para a
> implementação correspondente nesta extension que consome o Hermes via ACP.
> Útil para QA — para cada item abaixo, a feature deve ser testável dentro do
> VS Code padrão.

## Os 5 pilares do Cascade (Seaflux)

1. **Cascade Agent** → `session/prompt` + `session/update` (ACP). Plano via
   `plan` update. Tools via `tool_call`/`tool_call_update`.
2. **Memory** → `~/.hermes/memories/` + `hermes memory` provider. Memória
   persistente por repo e global.
3. **Turbo Mode** → `--yolo` na CLI / opção por turn na extension. Bypass de
   approval.
4. **MCP Integrations** → gerenciado pelo Hermes; a extension apenas cataloga
   e exibe via `hermes mcp list`.
5. **IDE + Agent Fusion** → extension roda no VS Code padrão (não fork).
   Render: webview React + status bar + commands + diff inline.

## Features individuais

| # | Feature do Cascade | Como reproduzimos | Onde |
|---|---|---|---|
| 1 | **Chat no editor** | Sidebar webview com markdown streaming | `webview/src/components/ChatView.tsx` |
| 2 | **Inline AI** (Cmd+I) | Command + inputbox + diff inline | `src/commands/inlineEdit.ts` |
| 3 | **Cascade Code mode** | Toggle no header: "Edit" vs "Ask" | `webview/src/components/ModePicker.tsx` |
| 4 | **Cascade Chat mode** | Mesmo, modo "Ask" | idem |
| 5 | **Plans / Todo lists** | Render `session/update` `plan` entries | `webview/src/components/PlanList.tsx` |
| 6 | **Tool calls visíveis** | Cards com kind icon, status, content | `webview/src/components/ToolCallCard.tsx` |
| 7 | **Multi-file edits** | Sequência de `tool_call` com `diff` content; VS Code abre arquivos | `src/services/diffViewer.ts` |
| 8 | **File reads com preview** | `read` kind → abre como preview tab | `src/services/toolExecutor.ts` |
| 9 | **Terminal integration** | `terminal/*` ACP; roda comandos em `vscode.window.createTerminal` | `src/acp/handlers.ts` |
| 10 | **Build & test verification** | Hermes roda terminal commands, output capturado | herdado do Hermes |
| 11 | **Real-time codebase awareness** | `--pass-session-id`, AGENTS.md, .cursorrules injetados | `src/services/workspaceContext.ts` |
| 12 | **Memories & Rules** | UI dedicada a `~/.hermes/memories/` + editar AGENTS.md | `webview/src/components/MemoriesPanel.tsx` |
| 13 | **Web search** | Tool `web` do Hermes (Firecrawl/Tavily) | herdado |
| 14 | **App Deploys** | Tool `deployment`/MCP server | exposto via MCP |
| 15 | **Workflows / Rulebooks** | Skills do Hermes (`hermes skills list`) | `webview/src/components/SkillsPicker.tsx` |
| 16 | **Linter auto-fix** | Hermes tem LSP (`hermes lsp install-all`); extensão expõe comando | `src/commands/installLsp.ts` |
| 17 | **Model selection** | Dropdown com `hermes model` picker | `webview/src/components/ModelPicker.tsx` |
| 18 | **Supercomplete** | Fora do escopo (completion provider separado). Não implementado. | n/a |
| 19 | **Queued messages** | Fila local no webview | `webview/src/state/store.ts` |
| 20 | **Permission prompts** | Modal nativo VS Code com `Allow once / Always / Reject` | `webview/src/components/PermissionDialog.tsx` |
| 21 | **Slash commands** | Menu `/` com comandos do TUI Hermes | `webview/src/components/SlashMenu.tsx` |
| 22 | **Session history** | `hermes sessions list` populado num picker | `webview/src/components/SessionSwitcher.tsx` |
| 23 | **Resume / Fork / Branch** | Botões que chamam `session/resume`, `session/fork`, `session/branch` | `src/services/sessionManager.ts` |
| 24 | **Checkpoints / Rollback** | `--checkpoints` flag + `/rollback` slash | `src/commands/checkpoint.ts` |
| 25 | **Image attachments** | Drag-drop no input → `ContentBlock::Image` (requer `promptCapabilities.image`) | `webview/src/components/InputBox.tsx` |
| 26 | **Audio attachments** | Mesmo, com `promptCapabilities.audio` | idem |
| 27 | **Embedded context** | Botão "#" para anexar arquivo como `ContentBlock::Resource` | idem |
| 28 | **Tab/queue planning** | Plano com priority/status (high/medium/low, pending/in_progress/completed) | `webview/src/components/PlanList.tsx` |
| 29 | **Token usage / cost** | `usage_update` → status bar + footer | `src/ui/statusBar.ts` |
| 30 | **Multiple sessions** | Session list no header | `webview/src/components/SessionSwitcher.tsx` |
| 31 | **MCP servers management** | Catálogo + enable/disable | `webview/src/components/McpPicker.tsx` |
| 32 | **Session title (rename)** | `/title` slash command | `src/services/sessionManager.ts` |
| 33 | **Voice input (TTS/STT)** | TTS via `elevenlabs` toolset; STT via Vosk opcional | herdado / opcional |
| 34 | **Live preview (web apps)** | Não é parte do Cascade. Opcional via `app-deploys` tool. | fora |
| 35 | **Deep contextual awareness** | Indexação semântica é feita pelo Hermes/MCP; a extension apenas expõe | herdado |
| 36 | **Repo rules (.cursorrules)** | Lê e injeta automaticamente (Hermes já faz) | `src/services/workspaceContext.ts` |
| 37 | **Onboarding / Install wizard** | Painel que detecta `hermes` no PATH, oferece instalar | `webview/src/components/Onboarding.tsx` |
| 38 | **Status bar com modelo + status** | Status bar persistente | `src/ui/statusBar.ts` |
| 39 | **Cancel mid-turn** | Stop button → `session/cancel` notification | `webview/src/components/InputBox.tsx` |
| 40 | **Context compact** | `/compact` slash | exposto |

## Resumo de cobertura

- **Implementado por esta extension:** chat, inline edit, plans, todos, tools,
  permissions, sessions, skills, MCP, model picker, modes, slash commands,
  image attach, checkpoints, usage, cancel, status bar, onboarding, diffs.
- **Herdado do Hermes (sem reescrita):** terminal execution, web search, code
  execution, code generation, multi-file edits, memory, MCP transport, skills
  execution, model routing, fallback chain.
- **Fora do escopo intencional:** Supercomplete (requer provider de completion
  VS Code separado), Live preview (UI server externa), Voice input full-duplex
  (precisa de UI web separada).

## Validação

Para validar cobertura, rode estes testes manuais no VS Code após `pnpm dev`:

1. Cmd+L → chat abre, digite "olá" → resposta streaming.
2. Selecione texto → Cmd+I → "refatore para arrow function" → diff aparece.
3. `/` no input → menu com `/new`, `/title`, `/compact`, `/yolo`, `/skills`.
4. Pense "build a todo app" → vê Plan com 5+ entries aparecendo.
5. Cada Plan entry vira tool call visível com kind icon.
6. Approval prompt aparece em comandos perigosos.
7. `hermes sessions list` é populado com o que criamos.
8. Image drag-drop no input → enviado como `ContentBlock::Image`.
9. Sessão offline (sem internet) → mensagem clara, sem crash.
10. Cancel mid-turn → stop reason `cancelled`.
