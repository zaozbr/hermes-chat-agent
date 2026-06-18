# 🔙 Protocolo `oi!` — Retomada de Sessão

> Este arquivo define o workflow executado quando o usuário digita `oi!` no chat.
> O workflow completo está em `.github/copilot-instructions.md`.
> Este é um resumo rápido de referência.

## Quando usar

- Usuário digita `oi!` → **EXECUTAR IMEDIATAMENTE**
- Objetivo: retomar do último checkpoint salvo sem perder contexto

## Passos Rápidos

1. **Reabsorver conhecimento** (leitura rápida):
   - `PROGRESS.md` (header) → checkpoint, tag, commit, próximo passo
   - `AGENTS.md` → regras inegociáveis
   - `docs/ARCHITECTURE.md` → visão geral

2. **Verificar ambiente**:
   - `npx vitest run` → confirmar testes passando
   - (Opcional) `hermes mcp list` → confirmar MCPs

3. **Postar status box** com:
   - Data do checkpoint, tag safepoint, commit hash
   - Status dos testes
   - Resumo do que foi feito na última sessão
   - Próximo passo planejado

4. **Perguntar**: "O que você quer fazer agora?"

## Regras

- ❌ NÃO refazer build completo
- ❌ NÃO iniciar tarefas sem instruções
- ❌ NÃO modificar arquivos — só leitura
- ✅ Se não achar checkpoint válido, executar **Workflow Automático de Início de Sessão**
