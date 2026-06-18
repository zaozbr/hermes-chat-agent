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
- ✅ **Copilot CLI plugins**: 5 plugins instalados via `copilot plugin install`
  - `superpowers@superpowers-marketplace` (14 skills)
  - `episodic-memory@superpowers-marketplace` (memória entre sessões)
  - `testing-automation@awesome-copilot` (testes/TDD)
  - `context-engineering@awesome-copilot` (contexto otimizado)
  - `typescript-mcp-development@awesome-copilot` (MCP SDK TS)

#### 📚 Skills Consult

Antes de iniciar qualquer tarefa, consulte os skills relevantes em:

1. **`.agents/skills/`** — 41 skills instalados via skills.sh (Superpowers, Anthropic, Vercel, Vibe)
2. **`skills/`** — Skills baixados manualmente para referência
3. Use a tabela de skills abaixo para escolher qual consultar

### Passo 3: Iniciar Trabalho

- Consulte o **Todo Tree** novamente antes de cada tarefa — novos TODOs podem ter surgido
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
"C:\Program Files\Microsoft VS Code\Code.exe" --uninstall-extension hermes-agent.vscode-hermes-agent
"C:\Program Files\Microsoft VS Code\Code.exe" --install-extension "E:\Hermes agent\vscode-hermes-agent-0.1.0.vsix" --force
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

## 🚀 COMANDO `commit!` — Protocolo de Finalização

**Quando o usuário digitar `commit!` no chat, EXECUTE IMEDIATAMENTE:**

### Passo 1: Documentar
- Capture tudo da sessão: o que foi feito, lições aprendidas, conhecimento gerado
- Atualize `PROGRESS.md` com nova seção (data + resumo)
- Salve descobertas importantes na memória (`/memories/`)

### Passo 2: Safepoint
- Crie timestamp: `yyyyMMdd-HHmmss`
- Crie tag git: `git tag safepoint-<timestamp>`
- Crie diretório: `.backups/commit-<timestamp>/`

### Passo 3: Backup
- `git diff --name-only` → arquivos modificados
- `git ls-files --others --exclude-standard` → arquivos novos
- Copie TODOS para `.backups/commit-<timestamp>/`

### Passo 4: Stage
- `git add --all`

### Passo 5: Accept (Verificação)
- `git status --short` → mostre resumo
- Verifique se há erros de compilação

### Passo 6: Commit
- Construa mensagem descritiva: `<tipo>(<escopo>): <descrição>`
- `git commit -m "..."`

### Passo 7: Push
- `git push origin HEAD`

### Passo 8: Resume Point (Retorno)
- Atualize `PROGRESS.md` com checkpoint (data/hora + próximos passos)
- Atualize user memory (`/memories/`) com lições e descobertas
- Atualize repo memory (`/memories/repo/`) se necessário
- Verifique se `.github/copilot-instructions.md` reflete o estado atual
- Garanta que o header do `PROGRESS.md` tenha: `> 🔙 Retomar com: oi!`

---

## 🔙 COMANDO `oi!` — Protocolo de Retomada de Sessão

**Quando o usuário digitar `oi!` no chat, EXECUTE IMEDIATAMENTE este workflow para retomar do checkpoint salvo:**

### Passo 1: Reabsorver Conhecimento (rápido)
Leia na ordem:

1. **`PROGRESS.md`** (apenas o header) → Identificar checkpoint, tag safepoint, commit, próximo passo
2. **`AGENTS.md`** → Regras inegociáveis
3. **`docs/ARCHITECTURE.md`** → Diagrama de componentes (rápido)

### Passo 2: Verificar Ambiente
Execute rapidamente (não precisa exibir tudo — só confirmar que está OK):

```
npx vitest run → 8/8 passing?
```

### Passo 3: Postar Status Box

```
╔══════════════════════════════════════════════════════════════╗
║           🔙 SESSÃO RETOMADA — CHECKPOINT ✅               ║
║                                                              ║
║  📅  DATA:      <data do checkpoint>                        ║
║  🏷️  TAG:       <safepoint-xxxx>                            ║
║  📍  COMMIT:    <hash>                                      ║
║  🧪  TESTES:    <N>/<N> passando                            ║
║  🏗️  ÚLTIMA:    <resumo do que foi feito>                   ║
║                                                              ║
║  ▶️ PRÓXIMO:     <próximo passo planejado>                   ║
║  💬 PERGUNTA:   "O que você quer fazer agora?"              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Passo 4: Perguntar
- Termine com: **"O que você quer fazer agora?"** — e aguarde instruções do usuário.

### Regras
1. **NÃO** refazer build nem rodar testes completos a menos que o usuário peça
2. **NÃO** iniciar nenhuma tarefa sem o usuário dizer o que quer
3. **NÃO** modificar nenhum arquivo — só leitura e apresentação
4. Se não achar um checkpoint válido, execute o **WORKFLOW AUTOMÁTICO DE INÍCIO DE SESSÃO** (seção acima)

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
- **Test**: `vitest` (6 testes em 2 files: `tests/hermesDetector.test.ts`, `tests/hermesAgentProvider.test.ts`)

---

## 🔧 Comandos Rápidos

| Comando                                     | Descrição             |
| ------------------------------------------- | --------------------- |
| `node scripts/build.mjs --mode production`  | Build completo        |
| `npm test`                                  | Rodar todos os testes |
| `npm run test:watch`                        | Testes em watch mode  |
| `npm run test:coverage`                     | Testes com cobertura  |
| `npm run test:ui`                           | UI mode interativa    |
| `npx tsc -p tsconfig.json --noEmit`         | Type check host       |
| `npx tsc -p tsconfig.webview.json --noEmit` | Type check webview    |
| `npx eslint src webview/src --quiet`        | Lint                  || `copilot --version`                          | Verificar Copilot CLI |
| `copilot plugin list`                        | Listar plugins ativos |
| `copilot plugin marketplace browse <name>`   | Navegar marketplace   |
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

## 🎯 Skills Ecosystem (skills.sh)

> 41 skills instaladas via `npx skills add <repo>`. O diretório `.agents/skills/` contém
> os arquivos SKILL.md com instruções detalhadas para o agente Copilot.
> **Consulte estes skills ANTES de iniciar qualquer tarefa complexa.**

### Instalados automaticamente

| Repositório               | Skills | Função                                        |
| ------------------------- | ------ | --------------------------------------------- |
| **obra/superpowers**      | 14     | TDD, debugging, planejamento, code review     |
| **anthropics/skills**     | 18     | MCP builder, frontend-design, documentos      |
| **vercel-labs/agent-skills** | 9   | React, deploy, otimização, composição         |
| **Vibe-Skills**           | 1      | Vibes / padrões de desenvolvimento            |

### Skills personalizados do projeto

| Skill | Arquivo | Função |
| ----- | ------- | ------ |
| **hermes-agent** | `.agents/skills/hermes-agent/SKILL.md` | Arquitetura, regras (deploy/QA), fluxo ACP, build, MCP, testes — **OBRIGATÓRIO** para qualquer alteração no Hermes |

### Os 14 Superpowers (mais relevantes)

| Skill                        | Quando usar                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `test-driven-development`    | Antes de codificar: escrever testes primeiro               |
| `systematic-debugging`       | Bugs complexos: rastreamento sistemático                   |
| `writing-plans`              | Planejamento antes de implementar grandes mudanças         |
| `subagent-driven-development`| Delegar subtarefas para subagentes                         |
| `brainstorming`              | Exploração de ideias e soluções criativas                  |
| `verification-before-completion` | Verificar se a solução atende aos requisitos          |
| `requesting-code-review`     | Pedir review de código efetivo                             |
| `receiving-code-review`      | Processar feedback de code review                          |
| `executing-plans`            | Executar planos passo-a-passo                              |
| `dispatching-parallel-agents`| Trabalho paralelo com múltiplos agentes                    |

### Skills da Anthropic

| Skill                   | Quando usar                                     |
| ----------------------- | ----------------------------------------------- |
| `frontend-design`       | Design de interfaces React/componentes          |
| `mcp-builder`           | Criar servidores MCP personalizados             |
| `claude-api`            | Integração com API Claude                       |
| `docx`/`pdf`/`pptx`/`xlsx` | Geração de documentos Office                 |
| `web-artifacts-builder` | Artefatos web standalone                        |
| `webapp-testing`        | Testes de aplicações web                        |
| `skill-creator`         | Criar seus próprios skills                      |

### Skills Vercel

| Skill                          | Quando usar                              |
| ------------------------------ | ---------------------------------------- |
| `vercel-optimize`              | Otimização de performance                |
| `vercel-react-best-practices`  | Melhores práticas React                  |
| `vercel-composition-patterns`  | Padrões de composição React              |
| `deploy-to-vercel`             | Deploy para Vercel                       |
| `web-design-guidelines`        | Diretrizes de design web                 |

### Como usar skills

```
# Consultar um skill específico (skills.sh):
npx skills use obra/superpowers@test-driven-development

# Listar skills instalados:
npx skills ls

# Usar no prompt: "Aplique o skill de TDD para implementar X"

# Skills do projeto (.agents/skills/hermes-agent/):
# São carregados automaticamente pelo contexto do projeto.
# O skill hermes-agent contém TODAS as regras do projeto Hermes.
# Consulte-o SEMPRE que for trabalhar neste projeto.
```

---

## 🌐 Marketplaces & Registries

### skills.sh (Vercel)
- **URL**: https://skills.sh
- **CLI**: `npx skills add <owner/repo>` — 701K+ installs, centenas de skills
- **Instalação**: Skills instalados em `.agents/skills/` para 71 agentes diferentes
- **Como buscar**: `npx skills find <keyword>`

### Open VSX
- **URL**: https://open-vsx.org — 14K+ extensões open-source
- **Config**: Descomentar `extensions.gallery` em `.vscode/settings.json`
- **Instalação manual**: Baixar .vsix → `code-insiders --install-extension <file>.vsix`

### MCP Registry
- **URL**: https://registry.modelcontextprotocol.io
- **Propósito**: Catálogo oficial de servidores MCP (centenas disponíveis)
- **Instalação**: `hermes mcp add <server-name>` ou config no JSON do MCP

### GitHub Copilot Plugin Marketplace
- **CLI**: `copilot plugin marketplace add obra/superpowers-marketplace`
- **Requer**: GitHub Copilot CLI (`npm install -g @githubnext/github-copilot-cli`)
- **Nota**: CLI não instalado atualmente — instale com `winget install --id GitHub.CopilotCLI` ou `npm i -g @githubnext/github-copilot-cli`

### VS Code Marketplace (Oficial)
- **URL**: https://marketplace.visualstudio.com/vscode
- **Acesso**: Direto pelo VS Code Insiders (padrão)
- **55 extensões** instaladas atualmente

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

## 📁 Estrutura do Projeto

```
e:\Hermes agent\
├── .github/copilot-instructions.md   ← VOCÊ ESTÁ AQUI (auto-load)
├── AGENTS.md                          ← Regras inegociáveis
├── EXTENSIONS_INTEGRATION.md          ← Guia completo de produtividade
├── PROGRESS.md                        ← Estado atual do projeto
├── .vscode/settings.json              ← Configurações otimizadas do workspace
├── .agents/skills/                    ← 41 skills (skills.sh ecosystem)
│   ├── test-driven-development/       ← Superpowers skill
│   ├── systematic-debugging/          ← Superpowers skill
│   ├── writing-plans/                 ← Superpowers skill
│   ├── frontend-design/               ← Anthropic skill
│   ├── mcp-builder/                   ← Anthropic skill
│   ├── vercel-optimize/               ← Vercel skill
    ├── hermes-agent/                  ← PROJETO: skill custom do Hermes
    └── ...                            ← +36 outros skills
├── skills/                            ← Skills baixados manualmente
│   ├── superpowers/                   ← 6 skills (cópia local)
│   ├── anthropic/                     ← 2 skills (cópia local)
│   └── vibe-skills/                   ← 1 skill (cópia local)
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

---

## 🔴 PROTOCOLO DE TAREFAS LONGAS (>40s) — OBRIGATÓRIO

**Se QUALQUER tarefa durar mais que 40 segundos, você DEVE imediatamente parar e postar no chat um status box chamativo neste formato:**

```
╔══════════════════════════════════════════════════════════════╗
║              🔶 TAREFA EM ANDAMENTO (>40s) 🔶              ║
║                                                              ║
║  🏗️  GENÉRICO:  <o que está fazendo em alto nível>        ║
║  🔧  ESPECÍFICO: <a sub-tarefa exata agora>                 ║
║  ⏳  STATUS:     <% ou descrição do progresso>              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Regras de execução:

1. **Ao atingir 40s de uma operação**, interrompa e poste o status box
2. **A cada 30s após isso**, atualize o chat com um novo status box refletindo o progresso
3. **Ao finalizar**, poste um status box verde de conclusão:

```
╔══════════════════════════════════════════════════════════════╗
║              ✅ TAREFA CONCLUÍDA 🎉                        ║
║                                                              ║
║  🏗️  GENÉRICO:  <mesmo de antes>                          ║
║  🔧  ESPECÍFICO: <o que foi feito>                         ║
║  ✅  STATUS:     CONCLUÍDO em <tempo total>                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Disparadores que ativam este protocolo:
- `run_in_terminal` com timeout longo (>40s)
- `runTests` com muitos arquivos
- `runSubagent` para tarefas complexas
- Múltiplas operações de arquivo em sequência
- Builds, deploys, instalações de pacotes
- Qualquer operação que você saiba de antemão que levará >40s

> ⚡ **Isto é OBRIGATÓRIO.** Não opcional. Não pule.

---

> ⚡ **Auto-loaded pelo Copilot a cada sessão.** Mantenha este arquivo atualizado
> com o estado mais recente do projeto para máxima produtividade.
>
> Última atualização: 2026-06-14
