# 🧪 Hermes Agent — Diretrizes de Testes Profundos

> ⚡ **Regra de Ouro**: _Cada alteração de código DEVE vir acompanhada de testes que validem o comportamento alterado. Testes rasos não são aceitos._

---

## 🎯 Filosofia

### O que "teste profundo" significa

| Teste raso ❌            | Teste profundo ✅                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| "o componente existe"    | "o componente renderiza corretamente em todos os estados possíveis"                           |
| "a função retorna algo"  | "a função retorna o valor correto para inputs válidos, inválidos, vazios, nulos e edge cases" |
| "um cenário feliz passa" | "todos os caminhos de erro, loading, empty, sucesso e cancelamento são cobertos"              |
| "testa só o que mudei"   | "testa o que mudei E garante que nada quebrou em componentes adjacentes"                      |

### Os 3 níveis de profundidade

```text
🥉 NÍVEL 1 — Essencial (OBRIGATÓRIO em toda alteração)
  ☐ Testa o cenário feliz (happy path)
  ☐ Testa 1 edge case (vazio, nulo, erro, ou timeout)
  ☐ Teste passa de forma confiável (sem flakiness)

🥈 NÍVEL 2 — Profissional (RECOMENDADO)
  ☐ Testa todos os estados: loading, empty, error, success, disabled
  ☐ Testa contratos: tipos, interfaces, mensagens entre componentes
  ☐ Teste de regressão: garante que comportamento anterior não quebrou
  ☐ Cobertura ≥ 80% statements, ≥ 70% branches na área alterada

🥇 NÍVEL 3 — World-Class (EXPECTATIVA PADRÃO para features complexas)
  ☐ Testes paramétricos (data-driven) para múltiplas variações
  ☐ Testes de integração reais (ACP, MCP, CLI) com mocks realistas
  ☐ Testes E2E cobrindo fluxos completos (user story)
  ☐ Testes de performance/bundle budget
  ☐ Testes de segurança (injeção, vazamento de dados)
  ☐ Snapshots ou testes visuais para componentes de UI
  ☐ Testes de acessibilidade (aria labels, roles, navegação teclado)
```

---

## 🏗️ Arquitetura de Testes Atual

```
tests/
├── *.test.ts              ← Unit tests (vitest, 39 tests)
│   ├── hermesDetector.test.ts      (1 test — smoke)
│   ├── hermesAgentProvider.test.ts (5 tests — provider + store)
│   ├── acpIntegration.test.ts      (1 test — ACP integration ✅)
│   └── modelSwitching.test.ts      (32 tests — catalog + setModel + getModel + scenarios)
├── e2e/
│   └── webview.spec.ts    ← E2E tests (Playwright, 15 tests)
└── setup.ts               ← Vitest setup (mocks)
```

### Stack

| Camada             | Framework            | Comando                                   |
| ------------------ | -------------------- | ----------------------------------------- |
| Unit / Integration | Vitest               | `npx vitest run`                          |
| E2E (webview)      | Playwright           | `npx playwright test`                     |
| Coverage           | Vitest (c8/istanbul) | `npx vitest run --coverage`               |
| Type check         | tsc                  | `npx tsc -p tsconfig.json --noEmit`       |
| E2E server         | Script local         | `node scripts/serve-e2e.cjs` (porta 9876) |

---

## 🚨 OBRIGATORIEDADE: Expandir Testes a Cada Alteração

Quando você alterar ou adicionar código, DEVE seguir este checklist:

### 1. Identificar o que testar

| Tipo de alteração         | O que testar                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------- |
| **Novo componente**       | Renderização, props, estados (loading/empty/error/success), interações do usuário  |
| **Nova função/método**    | Inputs válidos, inválidos, edge cases (null, undefined, empty string, 0, negative) |
| **Nova mensagem/handler** | Formato da mensagem, serialização, tratamento de erro, timeout                     |
| **Novo serviço**          | Mock da dependência externa, testar cada método com respostas reais simuladas      |
| **Novo fluxo (flow)**     | História completa do usuário: início → interação → resultado → cleanup             |
| **Correção de bug**       | Teste que reproduz o bug → teste que comprova a correção → teste de regressão      |
| **Refatoração**           | Garantir testes existentes passam + adicionar testes para comportamento extraído   |

### 2. Padrão para testes de componente React

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeuComponente } from './MeuComponente';

describe('MeuComponente', () => {
  // ── Render ──────────────────────────────────────
  it('renderiza com props padrão', () => {
    /* ... */
  });
  it('renderiza com children', () => {
    /* ... */
  });

  // ── Estados ─────────────────────────────────────
  it('mostra loading spinner quando isLoading=true', () => {
    /* ... */
  });
  it('mostra empty state quando lista vazia', () => {
    /* ... */
  });
  it('mostra mensagem de erro quando error é passado', () => {
    /* ... */
  });

  // ── Interações ──────────────────────────────────
  it('chama onClick quando botão é clicado', () => {
    /* ... */
  });
  it('desabilita botão quando disabled=true', () => {
    /* ... */
  });

  // ── Edge Cases ──────────────────────────────────
  it('lida com props undefined sem crashar', () => {
    /* ... */
  });
  it('lida com array vazio sem crashar', () => {
    /* ... */
  });
});
```

### 3. Padrão para testes de funções puras

```typescript
import { describe, it, expect } from 'vitest';
import { minhaFuncao } from './minhaFuncao';

describe('minhaFuncao', () => {
  // Happy path
  it('retorna resultado correto para input normal', () => {
    /* ... */
  });

  // Edge cases — use parametrização!
  it.each([
    [null, 'fallback'],
    [undefined, 'fallback'],
    ['', ''],
    ['  ', '  '],
    ['abc', 'ABC'],
  ])('lida com input %s → retorna %s', (input, expected) => {
    expect(minhaFuncao(input)).toBe(expected);
  });

  // Erro
  it('lança erro para input inválido', () => {
    expect(() => minhaFuncao(-1)).toThrow('Input inválido');
  });
});
```

---

## 🔄 Gatilho Automático: "Expand Tests"

**Sempre que você fizer commit, o protocolo `commit!` DEVE incluir uma seção de expansão de testes.**

```text
🧪 EXPANSÃO DE TESTES

Alterações feitas:
  - src/services/novoServico.ts
  - webview/src/components/NovoComponente.tsx

Testes adicionados:
  + tests/novoServico.test.ts (8 testes)
  + tests/NovoComponente.test.ts (6 testes)

Testes expandidos:
  • tests/hermesDetector.test.ts: +2 testes (edge cases)
  • tests/e2e/webview.spec.ts: +2 testes (novo fluxo)

Cobertura: 82% statements (+2% desde último commit)
```

---

## ⚡ Gatilho: "test esta feature"

Se o usuário disser "test esta feature" ou similar, você DEVE:

1. Analisar a feature: o que ela faz, quais são os inputs, outputs, edge cases
2. Escrever testes cobrindo:
   - 🟢 Happy path (funciona como esperado)
   - 🔴 Error path (o que acontece quando algo dá errado)
   - 🟡 Edge cases (valores limites, vazios, nulos)
   - ⚪ Estados visíveis (loading, empty, success, error)
3. Rodar e mostrar resultados
4. Apenas então considerar a tarefa completa

---

## 📊 Métricas de Qualidade

### Cobertura Mínima (CI)

| Métrica    | Mínimo | Alvo |
| ---------- | ------ | ---- |
| Statements | 80%    | 90%+ |
| Branches   | 70%    | 85%+ |
| Functions  | 75%    | 90%+ |
| Lines      | 80%    | 90%+ |

### Cobertura por Área

| Área                      | Prioridade | Testes necessários             |
| ------------------------- | ---------- | ------------------------------ |
| `src/services/`           | 🔴 Alta    | Unit + integração com mocks    |
| `src/providers/`          | 🔴 Alta    | Message handlers, edge cases   |
| `webview/src/components/` | 🔴 Alta    | Render, estados, interações    |
| `webview/src/state/`      | 🔴 Alta    | Store, subscriptions, messages |
| `src/acp/`                | 🟡 Média   | ACP protocol, conexão, erros   |
| `src/utils/`              | 🟡 Média   | Pure functions, formatadores   |
| `src/ui/`                 | 🟢 Baixa   | Status bar (com mock VS Code)  |

---

## 📝 Templates Rápidos

### Template: test file para componente

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeuComponente } from './MeuComponente';

// ── Mocks ──────────────────────────────────────────
const defaultProps = { /* ... */ };

// ── Setup ──────────────────────────────────────────
beforeEach(() => { vi.clearAllMocks(); });

// ── Tests ──────────────────────────────────────────
describe('MeuComponente', () => {
  // --- Render ---
  it('renderiza sem crashar', () => {
    render(<MeuComponente {...defaultProps} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  // --- Estados ---
  it('mostra loading quando isLoading', () => { /* ... */ });
  it('mostra erro quando error é passado', () => { /* ... */ });

  // --- Interações ---
  it('chama callback ao clicar', async () => {
    const onClick = vi.fn();
    render(<MeuComponente {...defaultProps} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Template: test file para store/mensagens

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store';

describe('Store', () => {
  beforeEach(() => {
    // Resetar store para estado inicial se necessário
    // (depende de como o reset é implementado)
  });

  it('processa mensagem X corretamente', () => {
    store.applyMessage({
      type: 'x',
      payload: {
        /* ... */
      },
    });
    const state = store.get();
    expect(state.x).toEqual(/* esperado */);
  });

  it('não quebra com payload vazio', () => {
    expect(() => store.applyMessage({ type: 'x', payload: {} })).not.toThrow();
  });

  it('notifica subscribers', () => {
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    store.applyMessage({ type: 'x', payload: {} });
    expect(fn).toHaveBeenCalled();
    unsub();
  });
});
```

---

## 🚀 Como Rodar

```bash
# Todos os testes unitários
npx vitest run

# Um arquivo específico
npx vitest run tests/hermesDetector.test.ts

# Com coverage
npx vitest run --coverage

# Watch mode
npx vitest

# UI interativa
npx vitest --ui

# E2E Playwright
npx playwright test

# Full QA
npm run fullcheck
```

---

> ⚡ Última atualização: 2026-06-19
