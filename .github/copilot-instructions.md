# 🧠 Hermes Agent — Copilot Auto Instructions

> Este arquivo é CARREGADO AUTOMATICAMENTE pelo Copilot a cada início de sessão.
> Ele contém o workflow de startup e as regras essenciais do projeto.

---

## ⚡ WORKFLOW AUTOMÁTICO DE INÍCIO DE SESSÃO

**TODO INÍCIO DE SESSÃO — EXECUTE ESTE WORKFLOW:**

### Passo 1: Reabsorver Conhecimento

Leia ESTES arquivos obrigatoriamente (nesta ordem):

1. **`AGENTS.md`** — Regras inegociáveis do projeto (deploy a cada alteração, QA!)
2. **`EXTENSIONS_INTEGRATION.md`** — Guia completo de extensões, configurações, fluxo de trabalho
3. **`PROGRESS.md`** — Estado atual do projeto, bugs conhecidos, próximos passos
4. **`docs/ARCHITECTURE.md`** — Diagrama de arquitetura e componentes
5. **`.vscode/settings.json`** — Configurações otimizadas do workspace

### Passo 2: Validar Ambiente

- Verifique se os TODOs estão visíveis (Todo Tree no painel lateral)
- Verifique se o Vitest Explorer está ativo (painel de Testes)
- Verifique se o Error Lens está marcando erros inline
- Verifique se a extensão Hermes está instalada (`hermes-agent.vscode-hermes-agent`)
- ✅ **Verifique os MCPs instalados**: `hermes mcp list` — devem aparecer 6 servidores (sequential-thinking, filesystem, github, memory, puppeteer, fetch-url)
- ✅ **Consulte a tabela de MCPs** na seção `🧩 MCP Servers Integrados` abaixo para saber quais tools estão disponíveis

### Passo 3: Iniciar Trabalho

- Siga as **REGRAS INEGOCIÁVEIS** do `AGENTS.md`
- Use a **QA Checklist** da seção 6 do `EXTENSIONS_INTEGRATION.md`
- Documente no `PROGRESS.md` qualquer mudança significativa

---

## 📋 REGRAS DO PROJETO (inline backup — caso arquivos não possam ser lidos)

### REGRA #1: Deploy a cada alteração

Toda vez que alterar código da extensão (`src/` ou `webview/`):

```
node scripts/build.mjs --mode production
npx vsce package --allow-missing-repository -o vscode-hermes-agent-0.1.0.vsix
code --uninstall-extension hermes-agent.vscode-hermes-agent
code --install-extension "E:\Hermes agent\vscode-hermes-agent-0.1.0.vsix" --force
→ Pedir Reload Window
```

NUNCA pular o uninstall. VS Code cacheia .vsix agressivamente.

### REGRA #2: QA antes de entregar

1. Trace o fluxo completo (webview → store → extension → service → resposta)
2. Verifique contratos (nomes de mensagens, campos, tipos)
3. Teste edge cases (vazio, nulo, erro, timeout)
4. Build DEVE passar (`node scripts/build.mjs --mode production`)
5. Testes DEVEM passar (`npx vitest run`)
6. Documente o teste (pass/fail) antes de entregar

### REGRA #3: Sempre absorver regras

Cada novo prompt DEVE reabsorver este arquivo + AGENTS.md.

---

## 🏗️ Arquitetura (visão 30s)

```
Extension Host (Node 20, esbuild CJS)
  ↕ postMessage
Webview (React 18 + Vite ESM)
  ↕ JSON-RPC 2.0 stdio
Hermes ACP (Python, hermes acp)
  ↕ LLMs, MCP, Skills, Memory, Tools
```

- **Host**: `src/extension.ts` → providers, services, ACP manager
- **Webview**: 6 abas (Chat/Setup/Cascade/Config/MCP/Tweaks)
- **State**: `webview/src/state/store.ts` (Store class, não Zustand)
- **Build**: `scripts/build.mjs` (esbuild host + vite webview)
- **Test**: `vitest` (1 teste em `tests/hermesDetector.test.ts`)

---

## 🔧 Comandos Rápidos

| Comando                                     | Descrição          |
| ------------------------------------------- | ------------------ |
| `node scripts/build.mjs --mode production`  | Build completo     |
| `npx vitest run`                            | Rodar testes       |
| `npx tsc -p tsconfig.json --noEmit`         | Type check host    |
| `npx tsc -p tsconfig.webview.json --noEmit` | Type check webview |
| `npx eslint src webview/src --quiet`        | Lint               |

---

## 🧩 Extensões Integradas

Todas configuradas em `.vscode/settings.json`:

- `vitest.explorer` — UI de testes
- `firsttris.vscode-jest-runner` — Run inline
- `mermaidchart.vscode-mermaid-chart` — Diagramas
- `ms-vscode.vscode-typescript-next` — TS nightly
- `gruntfuggly.todo-tree` — TODO/FIXME index
- `usernamehw.errorlens` — Erros inline
- `redhat.vscode-yaml` — Schema YAML
- `streetsidesoftware.code-spell-checker` — Ortografia
- `esbenp.prettier-vscode` — Formatação
- `dbaeumer.vscode-eslint` — Lint
- `bierner.markdown-mermaid` — Mermaid preview
- `mikestead.dotenv` — .env highlight
- `aaron-bond.better-comments` — Comentários coloridos

---

## 🧩 MCP Servers Integrados

Instalados via `hermes mcp add`. Ativados automaticamente em toda sessão do Hermes ACP.

| Servidor | Tools | Função Principal |
|----------|-------|-----------------|
| **sequential-thinking** | `sequential_thinking` | Raciocínio estruturado passo-a-passo com revisões e ramificações |
| **filesystem** | 13 tools: read, write, edit, search, tree, move, info | Acesso completo ao sistema de arquivos do workspace |
| **github** | 22 tools: issues, PRs, commits, search, files | Integração total com GitHub API |
| **memory** | 8 tools: create/delete/search entities, relations, graph | Grafo de conhecimento persistente entre sessões |
| **puppeteer** | 7 tools: navigate, screenshot, click, fill, evaluate | Automação de navegador Chrome headless |
| **fetch-url** | `fetch-url` | Fetch de páginas web → Markdown limpo |

> **Nota**: `filesystem` tem escopo restrito a `E:\Hermes agent`. `github` precisa de `GITHUB_TOKEN` no ambiente. `puppeteer` usa Chrome headless embutido.

### Quando usar cada MCP

| Situação | MCP | Tool |
|----------|-----|------|
| Debugging de fluxo complexo | sequential-thinking | `sequential_thinking` |
| Ler/escrever arquivos do projeto | filesystem | `read_text_file`, `write_file`, `edit_file` |
| Navegar na árvore do projeto | filesystem | `directory_tree`, `list_directory` |
| Buscar arquivos por padrão | filesystem | `search_files` |
| Criar/gerenciar issues | github | `create_issue`, `list_issues`, `update_issue` |
| Criar/mergear PRs | github | `create_pull_request`, `merge_pull_request` |
| Buscar código em repositórios | github | `search_code`, `search_repositories` |
| Salvar conhecimento entre sessões | memory | `create_entities`, `create_relations`, `search_nodes` |
| Testar renderização do webview | puppeteer | `puppeteer_navigate`, `puppeteer_screenshot` |
| Preencher formulários na UI | puppeteer | `puppeteer_fill`, `puppeteer_click` |
| Buscar conteúdo de páginas web | fetch-url | `fetch-url` |

---

## 📁 Estrutura do Projeto

```
e:\Hermes agent\
├── .github/copilot-instructions.md   ← VOCÊ ESTÁ AQUI (auto-load)
├── AGENTS.md                          ← Regras inegociáveis
├── EXTENSIONS_INTEGRATION.md          ← Guia completo de produtividade
├── PROGRESS.md                        ← Estado atual do projeto
├── .vscode/settings.json              ← Configurações do workspace
├── src/                               ← Extension host
│   ├── extension.ts
│   ├── acp/                           ← ACP client/manager
│   ├── providers/                     ← Webview providers
│   ├── services/                      ← Business logic
│   ├── ui/                           ← Status bar
│   └── utils/                        ← Logger
├── webview/                           ← React app
│   └── src/
│       ├── components/                ← UI components
│       ├── state/store.ts             ← State management
│       └── styles/                    ← CSS
├── dist/                              ← Built host
├── dist-webview/                      ← Built webview
├── tests/                             ← Vitest tests
└── scripts/                           ← Build tools
```

---

> ⚡ **Auto-loaded pelo Copilot a cada sessão.** Mantenha este arquivo atualizado
> com o estado mais recente do projeto para máxima produtividade.
>
> Última atualização: 2026-06-13
