# Hermes CLI — Knowledge Base (Local & Permanent)

> Documento de referência permanente sobre o **Hermes Agent** (Nous Research) que
> esta extension consome via ACP. Compilado a partir de `hermes /help`, do código
> em `C:\Users\Usuario\AppData\Local\hermes\hermes-agent`, da documentação oficial
> e da exploração via `hermes status`, `hermes acp --check`, etc.
>
> **Versão documentada:** Hermes Agent v0.15.1 (2026.5.29), upstream `c79e3fd0`.
> **Python:** 3.11.15 • **OpenAI SDK:** 2.24.0.

---

## 1. O que é

- **Hermes Agent** é um agente IA open-source da **Nous Research** com capacidades
  agentic, memória persistente, skills, MCP, terminal, voz, multi-provedor, etc.
- Distribuído como **Python package** (`hermes-agent` no PyPI) que cria um venv
  isolado em `%LOCALAPPDATA%\hermes\hermes-agent\venv\`.
- Expõe vários protocolos: **ACP** (JSON-RPC stdio), **TUI gateway** (JSON-RPC
  stdio/WS) e **API server** (HTTP+SSE). Esta extension consome **ACP**.

## 2. Localização típica

| Item | Caminho (Windows) |
|---|---|
| `hermes.exe` | `C:\Users\Usuario\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe` |
| `hermes-acp.exe` | `C:\Users\Usuario\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes-acp.exe` |
| Hermes home (`HERMES_HOME`) | `C:\Users\Usuario\AppData\Local\hermes\` |
| `config.yaml` | `%HERMES_HOME%\config.yaml` |
| `.env` (segredos) | `%HERMES_HOME%\.env` |
| Logs | `%HERMES_HOME%\logs\agent.log`, `errors.log`, `gateway.log`, `gui.log`, `desktop.log` |
| Sessões (SQLite) | `%HERMES_HOME%\state.db` |
| Skills | `%HERMES_HOME%\skills\` (instaladas) + `<repo>/skills/` (locais) |
| Memória | `%HERMES_HOME%\memories\` |
| Sandboxes | `%HERMES_HOME%\sandboxes\` |
| Checkpoints (filesystem) | `%HERMES_HOME%\checkpoints\` |
| Node.js (browser tools) | `%HERMES_HOME%\node\` |
| Icons / branding | `assets/`, `infographic/` |

Em *nix o equivalente fica em `~/.hermes/`.

## 3. Subcomandos principais

| Comando | Para quê |
|---|---|
| `hermes` ou `hermes chat` | Inicia chat interativo (TUI/REPL). |
| `hermes chat -q "..."` | Single query (não interativo). |
| `hermes chat --tui` | Força a TUI moderna (Ink/TypeScript). |
| `hermes chat --cli` | Força a REPL clássica. |
| `hermes -z "..."` | One-shot: stdout recebe **apenas** a resposta final. |
| `hermes acp` | **Servidor ACP** (JSON-RPC stdio) — o que esta extension consome. |
| `hermes mcp serve` | Expõe o Hermes como servidor MCP para outros agentes. |
| `hermes mcp add/remove/install/list` | Gerencia servidores MCP. |
| `hermes lsp` | Gerencia Language Servers (`status`, `list`, `install`, `install-all`). |
| `hermes setup [seção]` | Wizard: `model`, `tts`, `terminal`, `gateway`, `tools`, `agent`. |
| `hermes setup --portal` | One-shot Portal Nous (OAuth + model pick). |
| `hermes model` | Seletor interativo de provider + modelo. |
| `hermes fallback [add|remove|list]` | Cadeia de fallback de providers. |
| `hermes auth add/list/remove/reset` | Pool de credenciais. |
| `hermes login` / `hermes logout` | OAuth de provider específico. |
| `hermes status` | Status detalhado de todos componentes. |
| `hermes doctor [--fix]` | Diagnóstico + auto-fix. |
| `hermes tools [list\|enable\|disable]` | Toolsets ativos. |
| `hermes skills [browse\|search\|install\|list\|...]` | Marketplace de skills. |
| `hermes sessions [list\|export\|delete\|browse\|...]` | Histórico SQLite. |
| `hermes logs [agent\|errors\|gateway] -f` | Tail de logs. |
| `hermes insights [--days N]` | Analytics de uso. |
| `hermes update [--check\|--yes\|--branch]` | Pull do git + reinstala deps. |
| `hermes uninstall` | Desinstala. |
| `hermes postinstall` | Bootstrap não-Python: node, browser, ripgrep, ffmpeg. |
| `hermes hooks` | Gerencia shell-script hooks. |
| `hermes checkpoint` | Inspect/prune filesystem checkpoints. |
| `hermes config [show\|edit\|set\|path]` | Inspeção/edição de config. |
| `hermes backup` / `hermes import` | Backup/restore do `~/.hermes/`. |
| `hermes debug share` | Upload de debug report. |
| `hermes dashboard [--port]` | UI web (porta 9119). |
| `hermes completion` | Shell completion (bash/zsh/fish). |
| `hermes prompt-size` | Byte breakdown do system prompt. |

## 4. Flags globais relevantes para ACP

| Flag | Significado |
|---|---|
| `--accept-hooks` | Auto-aprova shell hooks sem TTY. |
| `--ignore-user-config` | Ignora `~/.hermes/config.yaml` (modo isolado). |
| `--ignore-rules` | Não injeta `AGENTS.md`, `SOUL.md`, `.cursorrules`, memória, skills. |
| `--pass-session-id` | Inclui o session_id no system prompt. |
| `--worktree` / `-w` | Roda num worktree isolado (paralelismo). |
| `--yolo` | Bypass de todos os approval prompts de comandos perigosos. |
| `--checkpoints` | Habilita filesystem checkpoints (usar `/rollback`). |
| `--max-turns N` | Limite de iterações tool-calling por turn (default 90). |
| `--skills nome1,nome2` | Pré-carrega skills na sessão. |
| `-m modelo` / `--provider prov` | Override de modelo/provider. |
| `--resume SESSION_ID` / `-c [nome]` | Retoma sessão. |
| `--source tag` | Filtra sessão (default `cli`; usar `tool` para integração). |
| `--tui` / `--cli` | Seleciona interface. |
| `--dev` | Em TUI, roda TS source via `tsx`. |

Para ACP, o **recomendado** é manter a sessão como `tool` (`--source tool`) e
habilitar `--accept-hooks` (ou setar `HERMES_ACCEPT_HOOKS=1`) para que a extension
possa responder aos prompts sem precisar de TTY.

## 5. ACP — Agent Client Protocol

### 5.1 O que é

- **ACP** é um padrão aberto **JSON-RPC 2.0** sobre **stdio** (newline-delimited),
  criado pela **Zed Industries** (ago/2025) e adotado por **JetBrains** (out/2025)
  e **Google**. Licença Apache 2.0.
- Analogia: ACP é o **LSP** dos agentes de código. Editor fala ACP, agente
  expõe ACP. Decoupling total.
- Repo: `github.com/agentclientprotocol/agent-client-protocol`
- Spec web: `agentclientprotocol.com`
- TypeScript SDK: `@agentclientprotocol/sdk` (npm) — **versão 0.25.0**
- Esta extension **usa o SDK oficial** como dependência.

### 5.2 Métodos que o Hermes implementa (do lado do agente)

**Baseline (obrigatórios):**
- `initialize` (com `protocolVersion: 1`)
- `authenticate` (Hermes anuncia método `hermes-setup` para setup terminal)
- `session/new`
- `session/prompt`
- Notificação `session/cancel`

**Opcionais que o Hermes expõe:**
- `session/load` (capability `loadSession: true`)
- `session/resume` (capability `sessionCapabilities.resume: {}`)
- `session/close` (capability `sessionCapabilities.close: {}`)
- `session/fork` (Hermes adiciona)
- `session/list` (Hermes adiciona)
- `session/set_mode`
- `authenticate` / `logout`

### 5.3 Métodos que a extension implementa (lado do cliente)

**Baseline:**
- `session/request_permission` → modal com Allow once / Allow always / Reject

**Opcionais (a extension implementa):**
- `fs/read_text_file` → VS Code `workspace.fs.readFile`
- `fs/write_text_file` → VS Code `workspace.fs.writeFile` (+ dirty editor)
- `terminal/create` → `vscode.window.createTerminal` + ID
- `terminal/output` → buffer de linhas capturadas
- `terminal/release` → `terminal.dispose()`
- `terminal/wait_for_exit` → resolve quando processo termina
- `terminal/kill` → `terminal.sendText` Ctrl-C / dispose

### 5.4 Capacidades negociadas no `initialize`

**Client → Agent (a extension):**
```json
{
  "protocolVersion": 1,
  "clientCapabilities": {
    "fs": { "readTextFile": true, "writeTextFile": true },
    "terminal": true
  },
  "clientInfo": { "name": "vscode-hermes-agent", "title": "Hermes Agent for VS Code", "version": "0.1.0" }
}
```

**Agent → Client (Hermes):**
```json
{
  "protocolVersion": 1,
  "agentCapabilities": {
    "loadSession": true,
    "promptCapabilities": { "image": true, "audio": true, "embeddedContext": true },
    "mcpCapabilities": { "http": true, "sse": true },
    "sessionCapabilities": {
      "resume": {}, "fork": {}, "list": {}, "close": {}
    },
    "auth": { "logout": true }
  },
  "agentInfo": { "name": "hermes-agent", "title": "Hermes Agent", "version": "0.15.1" },
  "authMethods": [
    { "id": "hermes-setup", "name": "Setup Hermes provider", "description": "..." }
  ]
}
```

### 5.5 Updates (`session/update`)

| `sessionUpdate` | Uso |
|---|---|
| `user_message_chunk` | Eco do user input (em replay de session/load). |
| `agent_message_chunk` | Texto streaming da resposta. |
| `agent_thought_chunk` | Raciocínio interno ("thinking"). |
| `tool_call` | Nova tool call. |
| `tool_call_update` | Progresso/conclusão de tool call. |
| `plan` | Lista de tasks (entrada `Plan`). |
| `available_commands_update` | Slash commands disponíveis. |
| `current_mode_update` | Mudança de modo. |
| `usage_update` | Tokens usados / limite / custo. |

### 5.6 `tool_call` kinds

`read`, `edit`, `delete`, `move`, `search`, `execute`, `think`, `fetch`, `other`.

Hermes mapeia: `read_file`/`search_files` → `read`, `patch`/`write_file` → `edit`,
`terminal` → `execute`, `clarify` → `think`, `web_*` → `fetch`.

### 5.7 Tool call content

- `content`: `TextContent | ImageContent | ResourceContent`
- `diff`: `path`, `oldText`, `newText` — renderizado como diff no editor
- `terminal`: `terminalId` (live output)

### 5.8 Stop reasons (no `session/prompt` response)

`end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`.

## 6. Comandos slash do Hermes (TUI)

Do help `hermes --cli`:
`/title`, `/new`, `/retry`, `/compact`, `/save`, `/model`, `/provider`, `/tools`,
`/skills`, `/mcp`, `/sessions`, `/branch`, `/fork`, `/rollback`, `/clear`,
`/undo`, `/redo`, `/exit`, `/quit`, `/help`, `/yolo`, `/compact`...

A extension expõe esses comandos num menu `/` dentro do chat.

## 7. Toolsets built-in (principais)

Do output `hermes`:
- `browser`, `browser-cdp`
- `clarify` (pergunta ao usuário quando ambíguo)
- `code_execution`, `computer_use`
- `cronjob`
- `delegation` (sub-agentes)
- `discord`, `slack`, `whatsapp`
- `hermes-acp` (toolset específico quando rodando sob ACP)
- `memory`, `file`/`read_file`/`write_file`/`patch`/`search_files`
- `terminal` (com approval de comandos perigosos)
- `web` (Firecrawl, Tavily, Browser Use)
- `image_gen` (FAL, OpenAI)
- `mcp` (todos os servidores MCP configurados)
- `git`, `github`
- `skills` (invocar skill)

## 8. Skills, MCP, Memória

- **Skills** ficam em `%HERMES_HOME%\skills\` (instaladas) ou `<repo>/skills/`
  (locais do projeto). Carregadas via `--skills nome` ou auto-injetadas.
- **MCP** servers são configurados via `hermes mcp add` e ficam em
  `~/.hermes/config.yaml` (chave `mcp_servers:`). Podem usar `stdio`, `http`
  ou `sse` (sse deprecated).
- **Memória persistente** fica em `~/.hermes/memories/` (provider
  configurável: local, honcho, etc.). Facts lembrados entre sessões.
- **AGENTS.md**, **SOUL.md**, **.cursorrules** são auto-injetados no system
  prompt a menos que `--ignore-rules` seja passado.

## 9. Variáveis de ambiente

| Env | Função |
|---|---|
| `HERMES_HOME` | Override do diretório `~/.hermes/`. |
| `HERMES_INFERENCE_MODEL` | Override do modelo (equivalente a `-m`). |
| `HERMES_ACCEPT_HOOKS=1` | Auto-aprova hooks (equivalente a `--accept-hooks`). |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc. | API keys alternativas às do `.env`. |
| `NOUS_PORTAL_URL`, `NOUS_INFERENCE_URL` | Endpoints customizados do Portal. |

## 10. Instalação / bootstrap

### 10.1 Instalação padrão

```bash
# 1) Bootstrap
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
# ou no Windows:
irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1 | iex

# 2) Setup interativo
hermes setup
# ou só o provider
hermes setup model

# 3) Verificação
hermes doctor
hermes status
```

### 10.2 Setup do tool gateway / browser

```bash
hermes acp --setup-browser         # interativo
hermes acp --setup-browser --yes   # aceita ~400MB do Chromium
hermes postinstall                 # bootstrap geral (node, ripgrep, ffmpeg)
```

### 10.3 Primeira autenticação

- **Nous Portal** (recomendado): `hermes login` ou `hermes setup --portal`
- **OpenRouter/Anthropic/OpenAI/etc.**: `hermes model` → escolhe provider →
  cola a API key → `hermes auth add <provider>` para pool de keys
- **OAuth Codex/Grok/Qwen**: `hermes auth add <provider>-oauth`

## 11. Cheatsheet para esta extension

```bash
# Comando de boot do ACP server
hermes acp --accept-hooks --source tool

# Bootstrap completo antes do primeiro connect
hermes postinstall
hermes acp --setup-browser --yes

# Com flags úteis em dev
hermes acp --accept-hooks --source tool --dev --check   # só verifica e sai

# Debug
hermes logs agent -f --component tools
hermes logs errors
hermes doctor --fix
hermes debug share
```

## 12. Limitações conhecidas do Hermes (lidas do código)

- Blocos não-text em `session/prompt` são atualmente ignorados para extração.
- ACP persiste em `state.db` e reaparece em `hermes sessions list`.
- ACP approval timeouts → **deny** por padrão (conservador).
- SSE transport de MCP está deprecated pelo spec MCP.

## 13. Recursos externos

- **Site oficial:** https://hermes-agent.nousresearch.com
- **GitHub:** https://github.com/NousResearch/hermes-agent
- **VS Code integration page:** https://hermes-agent.ai/integrations/vscode
- **ACP Editor integration doc:** https://hermes-agent.nousresearch.com/docs/user-guide/features/acp
- **ACP Programmatic integration:** https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration
- **ACP spec site:** https://agentclientprotocol.com
- **ACP GitHub:** https://github.com/agentclientprotocol/agent-client-protocol
- **ACP TypeScript SDK:** https://www.npmjs.com/package/@agentclientprotocol/sdk
- **ACP Python SDK:** https://github.com/agentclientprotocol/python-sdk

---

> **Atualize este arquivo** sempre que:
> 1. Atualizar o Hermes (`hermes update`) — registre nova versão.
> 2. Adicionar/descobrir novos subcomandos (`hermes /help`).
> 3. Mudanças no protocolo ACP (acompanhe o CHANGELOG do spec).
> 4. Novos toolsets/skills/MCP servers relevantes para o fluxo no editor.
