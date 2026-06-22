# AGENTS.md — Regras do Projeto Hermes VS Code Extension

> ⚡ **A cada início de sessão, execute o workflow automático definido em
> `.github/copilot-instructions.md` (auto-loaded pelo Copilot).**

---

## ⚡ WORKFLOW DE STARTUP (executar a cada início de sessão)

### Passo 1: Reabsorver Conhecimento

Leia ESTES arquivos obrigatoriamente (nesta ordem):

1. **`.github/copilot-instructions.md`** — Workflow de startup + regras inline
2. **`EXTENSIONS_INTEGRATION.md`** — Guia completo de extensões, configurações, fluxo de trabalho
3. **`PROGRESS.md`** — Estado atual do projeto, bugs conhecidos, próximos passos
4. **`docs/ARCHITECTURE.md`** — Diagrama de arquitetura e componentes
5. **`.vscode/settings.json`** — Configurações otimizadas do workspace

### Passo 2: Validar Ambiente

Cada ferramenta abaixo me dá contexto para tomar decisões melhores. Verifique **todas**:

#### 🔍 Contexto de Código

- **Todo Tree** → Abra o painel e leia os TODOs/FIXMEs/HACKs pendentes. Eles revelam bugs conhecidos, melhorias planejadas e dívida técnica. **Use como guia de prioridade.**
- **Error Lens** → Erros e warnings inline. Escaneie arquivos abertos para entender problemas ativos.
- **Vitest Explorer** → Painel de Testes. Verifique quantos testes existem, se passam, e quais áreas têm cobertura.

#### 🔌 Extensões do Projeto

- Extensão Hermes instalada (`hermes-agent.vscode-hermes-agent`)
- Extensão No-Credit-Limit instalada (`hermes-agent.no-credit-limit`)
- ✅ **MCPs**: `hermes mcp list` — 6 servidores (sequential-thinking, filesystem, github, memory, puppeteer, fetch-url)
- ✅ **Tabela de MCPs** abaixo para saber quais tools estão disponíveis
- ✅ **Ativação automática de MCP tools**: execute `activate_group_0_2` até `activate_group_5_2` para ativar tools do GitHub MCP (necessário a cada sessão)

### Passo 3: Iniciar Trabalho

- Consulte o **Todo Tree** novamente antes de cada tarefa — novos TODOs podem ter surgido
- Siga as **REGRAS INEGOCIÁVEIS** do `AGENTS.md`
- Use a **QA Checklist** da seção 6 do `EXTENSIONS_INTEGRATION.md`
- Documente no `PROGRESS.md` qualquer mudança significativa

---

## REGRA INEGOCIÁVEL #1: Deploy a cada alteração

**Toda vez que alterar código da extensão (src/ ou webview/), DEVO:**

1. `node scripts/build.mjs --mode production`
2. `npx vsce package --allow-missing-repository -o vscode-hermes-agent-0.1.0.vsix`
3. `"C:\Program Files\Microsoft VS Code\Code.exe" --uninstall-extension hermes-agent.vscode-hermes-agent`
4. `"C:\Program Files\Microsoft VS Code\Code.exe" --install-extension "E:\Hermes agent\vscode-hermes-agent-0.1.0.vsix" --force`
5. **Só então** pedir ao usuário para fazer **Reload Window**

**NUNCA** peça ao usuário para verificar sem ter desinstalado e reinstalado antes.
O VS Code caches agressivamente a extensão .vsix instalada.

---

## REGRA INEGOCIÁVEL #2: QA antes de entregar (🌍 Nível Mundial)

**Toda feature ou correção DEVE passar pelos 3 níveis de qualidade abaixo.
NUNCA entregar sem verificar fluxo completo com evidências.**

### 🥉 Nível 1 — Essencial (obrigatório SEMPRE)

```text
☐ Trace o fluxo completo: webview → store → extension → service → resposta
☐ Verifique contratos: nomes de mensagens, campos, tipos em TODOS os pontos
☐ Teste edge cases: vazios, nulos, erros, timeouts, cancelamento
☐ Build: node scripts/build.mjs --mode production ✅
☐ Testes: npx vitest run ✅  (mínimo 8/8 passando)
☐ TypeCheck: npx tsc -p tsconfig.json --noEmit ✅
☐ Documente: descreva o teste e resultado (pass/fail) na entrega
```

### 🥈 Nível 2 — Profissional (recomendado para toda entrega)

```text
☐ Cobertura: npx vitest run --coverage ≥ 80% statements, ≥ 70% branches
☐ Integração: teste o fluxo ACP real (hermes acp → prompt → resposta)
☐ Lint: npx eslint src webview/src --quiet ✅
☐ Formatação: npx prettier --check "src/**" "webview/**" ✅
☐ Segurança: npm audit --audit-level=moderate ✅ (sem vulnerabilities moderadas)
☐ Performance: dist/extension.js < 1MB, dist-webview/assets/main.js < 1MB
```

### 🥇 Nível 3 — World-Class (CI Pipeline — GitHub Actions)

```text
☐ CI Pipeline: .github/workflows/ci.yml roda em todo push/PR
☐ 6 gates automáticos: lint → typecheck → test/coverage → security → build → summary
☐ Coverage gate: ≥ 80% statements, ≥ 70% branches, ≥ 75% functions
☐ Bundle budget: host < 1MB, webview JS < 1MB, CSS < 100KB
☐ Security scan: npm audit + hardcoded secrets detection
☐ JUnit reports: gerados e arquivados
☐ VSIX: gerado, verificado e arquivado como artifact
```

### Comando Rápido (local)

```bash
npm run fullcheck   # typecheck + lint + coverage + security + build
```

ou passo a passo:

```bash
npm run typecheck     # 🔷 TypeScript
npm run test:coverage # 🧪 Tests + coverage
npm run security      # 🔒 npm audit
npm run build         # 📦 Build + bundle size check
```

---

## REGRA INEGOCIÁVEL #3: Sempre absorver regras

**Cada novo prompt DEVE reabsorver:**

- Este `AGENTS.md`
- `.github/copilot-instructions.md` (auto-loaded)
- `TESTING_GUIDELINES.md` (diretrizes de testes)
- `EXTENSIONS_INTEGRATION.md` (se disponível na sessão)

---

## REGRA INEGOCIÁVEL #4: 🧪 Expandir testes a CADA alteração

**Toda alteração de código DEVE vir acompanhada de expansão de testes.**
Consulte `TESTING_GUIDELINES.md` para templates, padrões e métricas.

| Tipo                       | Mínimo de testes novos                 |
| -------------------------- | -------------------------------------- |
| Novo componente            | 3+ (render, estados, interações)       |
| Nova função/método         | 3+ (happy path, edge cases, erro)      |
| Nova store handler/message | 2+ (payload válido, payload edge)      |
| Correção de bug            | 1+ (teste que comprova a correção)     |
| Refatoração                | 0 (mas garantir que existentes passam) |

**NUNCA aceitar estes como "teste suficiente":**

- ❌ "O componente existe" sem testar estados
- ❌ "A função retorna algo" sem testar edge cases
- ❌ Apenas happy path sem testar erros
- ❌ Testes que não rodam de forma confiável (flaky)

**Consultar `TESTING_GUIDELINES.md`** para templates, padrões e métricas.

---

## REGRA INEGOCIÁVEL #5: Nunca mexer no Unify Chat Provider

**🚫 NUNCA modificar configurações do Unify Chat Provider** (`smallmain.vscode-unify-chat-provider`) sem autorização explícita e verbal do usuário. Isso inclui:

- Endpoints, auth methods, apiKeys, modelos
- `unifyChatProvider.*` no `settings.json`
- `chatLanguageModels.json`
- Arquivos da extensão em `.vscode-insiders/extensions/smallmain.vscode-unify-chat-provider-*/`

**Exceção autorizada**: Consertar o endpoint **[FREE] DeepSeek V4 Flash Free (openCode Zen)** quando ele parar de funcionar — ver `RECOVER_DEEPSEEK_FIX.md` para o passo-a-passo completo. Resumo: `settings.json` → `"apiKey": " "`, patchear `chat-completion-client.js` → `token ?? ' '`, patchear `client.js` (github-copilot) → `'2022-11-28'`.

**Recovery doc:** `E:\Hermes agent\RECOVER_DEEPSEEK_FIX.md`
**Backup de rollback disponível em:** `E:\Hermes agent\.backups\` (2026-06-13)

## Build Commands

```bash
cd "E:\Hermes agent"

# Build completo
node scripts/build.mjs --mode production

# Package
npx vsce package --allow-missing-repository -o vscode-hermes-agent-0.1.0.vsix

# Deploy (sempre: uninstall → install — usar VS Code estável, NÃO Insiders)
"C:\Program Files\Microsoft VS Code\Code.exe" --uninstall-extension hermes-agent.vscode-hermes-agent
"C:\Program Files\Microsoft VS Code\Code.exe" --install-extension "E:\Hermes agent\vscode-hermes-agent-0.1.0.vsix" --force

# Testes
npm test          # rodar todos
npm run test:watch   # watch mode
npm run test:coverage  # com cobertura
npm run test:ui    # UI mode interativa
npx vitest run tests/hermesDetector.test.ts  # teste específico

# Lint + Type Check
npx eslint src webview/src --quiet
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.webview.json --noEmit
```

---

## 🏗️ Architecture (30s)

```text
Extension Host (Node 20, esbuild CJS)  ←postMessage→  Webview (React 18 + Vite ESM)
     ↕ JSON-RPC 2.0 stdio
Hermes ACP (Python, hermes acp)
     ↕ LLMs, MCP, Skills, Memory, Tools
```

- **Host**: `src/extension.ts` → providers, services, ACP manager
- **Webview**: 6 abas (Chat/Setup/Cascade/Config/MCP/Tweaks)
- **State**: `webview/src/state/store.ts` (Store class)
- **Build**: `scripts/build.mjs` (esbuild + vite)
- **Test**: `vitest` em `tests/`

## Key Files

| Arquivo                               | Papel                                |
| ------------------------------------- | ------------------------------------ |
| `src/extension.ts`                    | Activation, provider registration    |
| `src/providers/chatPanelProvider.ts`  | Webview provider + message handlers  |
| `src/services/hermesInstaller.ts`     | Model set/get via hermes CLI         |
| `src/services/hermesDetector.ts`      | Auto-detection of hermes CLI         |
| `src/services/sessionManager.ts`      | Session lifecycle                    |
| `src/services/processRunner.ts`       | Subprocess manager (timeout, cancel) |
| `webview/src/state/store.ts`          | React state (State, Store)           |
| `webview/src/components/ChatView.tsx` | Main chat view (Ask/Edit/Cascade)    |
| `webview/src/styles/components.css`   | All component styles (900+ linhas)   |

---

## 📁 Estrutura do Projeto

```text
e:\Hermes agent\
├── .github/copilot-instructions.md   ← AUTO-LOADED pelo Copilot
├── AGENTS.md                          ← VOCÊ ESTÁ AQUI
├── EXTENSIONS_INTEGRATION.md          ← Guia de produtividade
├── PROGRESS.md                        ← Estado atual e próximos passos
├── .vscode/settings.json              ← Config workspace otimizada
├── src/                               ← Extension host (TypeScript)
│   ├── extension.ts
│   ├── acp/                           ← ACP client
│   ├── providers/                     ← Webview providers
│   ├── services/                      ← Business logic
│   ├── ui/                           ← Status bar
│   └── utils/                        ← Logger
├── webview/                           ← React app
│   └── src/
│       ├── components/                ← UI
│       ├── state/store.ts             ← State management
│       └── styles/                    ← CSS
├── dist/ + dist-webview/              ← Outputs
├── tests/                             ← Vitest tests
└── scripts/                           ← Build tools
```

---

## 🧩 Extensões VS Code Integradas

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

| Servidor                | Tools                                                    | Função Principal                                                 |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| **sequential-thinking** | `sequential_thinking`                                    | Raciocínio estruturado passo-a-passo com revisões e ramificações |
| **filesystem**          | 13 tools: read, write, edit, search, tree, move, info    | Acesso completo ao sistema de arquivos do workspace              |
| **github**              | 22 tools: issues, PRs, commits, search, files            | Integração total com GitHub API                                  |
| **memory**              | 8 tools: create/delete/search entities, relations, graph | Grafo de conhecimento persistente entre sessões                  |
| **puppeteer**           | 7 tools: navigate, screenshot, click, fill, evaluate     | Automação de navegador Chrome headless                           |
| **fetch-url**           | `fetch-url`                                              | Fetch de páginas web → Markdown limpo                            |

> **Nota**: `filesystem` tem escopo restrito a `E:\Hermes agent`. `github` precisa de `GITHUB_TOKEN` no ambiente. `puppeteer` usa Chrome headless embutido.

### Quando usar cada MCP

| Situação                          | MCP                 | Tool                                                  |
| --------------------------------- | ------------------- | ----------------------------------------------------- |
| Debugging de fluxo complexo       | sequential-thinking | `sequential_thinking`                                 |
| Ler/escrever arquivos do projeto  | filesystem          | `read_text_file`, `write_file`, `edit_file`           |
| Navegar na árvore do projeto      | filesystem          | `directory_tree`, `list_directory`                    |
| Buscar arquivos por padrão        | filesystem          | `search_files`                                        |
| Criar/gerenciar issues            | github              | `create_issue`, `list_issues`, `update_issue`         |
| Criar/mergear PRs                 | github              | `create_pull_request`, `merge_pull_request`           |
| Buscar código em repositórios     | github              | `search_code`, `search_repositories`                  |
| Salvar conhecimento entre sessões | memory              | `create_entities`, `create_relations`, `search_nodes` |
| Testar renderização do webview    | puppeteer           | `puppeteer_navigate`, `puppeteer_screenshot`          |
| Preencher formulários na UI       | puppeteer           | `puppeteer_fill`, `puppeteer_click`                   |
| Buscar conteúdo de páginas web    | fetch-url           | `fetch-url`                                           |

---

## Regra Innegociável #6: Versionamento e Testes Automatizados
---
### Passo 1 – Incrementar a versão
- Quando um teste for solicitado, a extensão deve ter seu `version` incrementado seguindo a convenção SemVer baseada na natureza da mudança (major, minor, patch).
- Utilize `npm version <journey>` (por ex., `npm version patch`) para atualizar `package.json` e criar o commit/tag automaticamente.
### Passo 2 – Build e Deploy no VS Code
- Rode `node scripts/build.mjs --mode production` para gerar o VSIX.
- Desinstale a extensão já instalada: ```bash
code --uninstall-extension hermes-agent.vscode-hermes-agent
```
- Instale o VSIX recém‑gerado: ```bash
code --install-extension .\\vscode-hermes-agent-<versao>.vsix --force
```
### Passo 3 – Testes Automatizados no VS Code
- Execute os testes de unidade: `npm test`.
- Execute os testes end‑to‑end pelo Playwright em VS Code: `npm run test:e2e` (esse script já invoca o VS Code estável).
- Apenas se ambos passarem prossiga ao próximo passo.
### Passo 4 – Commit e Tag Final
- Após o sucesso dos testes, rode `commit!` para aplicar a etapa de documentação e backup automática.
---
