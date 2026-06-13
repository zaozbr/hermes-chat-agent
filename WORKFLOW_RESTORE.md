# WORKFLOW RESTORE - Estado Atual do Projeto Hermes Agent
**Data:** 2026-06-13
**Sessão:** Teste de modelos [FREE] do Unify Chat Provider

---

## 📋 RESUMO EXECUTIVO

Testei **34 modelos [FREE]** configurados no Unify Chat Provider (backup `.backups/unify-chat-provider-endpoints.2026-06-13.json`) usando API keys encontradas em `C:\Users\Usuario\Desktop\pessoal\curriculo\html\rasc.md`.

---

## ✅ MODELOS FUNCIONANDO (Direto via API)

### **OpenRouter** (key: `sk-or-v1-***`)
| Modelo | Provider | Status |
|--------|----------|--------|
| `google/gemma-4-31b-it:free` | OpenInference | ✅ 200 OK |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | Nvidia | ✅ 200 OK |
| `nvidia/nemotron-3-super-120b-a12b:free` | Nvidia | ✅ 200 OK |
| `nvidia/nemotron-3-nano-30b-a3b:free` | Nvidia | ✅ 200 OK |
| `nvidia/nemotron-nano-9b-v2:free` | Nvidia | ✅ 200 OK |
| `openrouter/owl-alpha` | Stealth | ✅ 200 OK |

### **NVIDIA API Direta** (key: `nvapi-***`)
| Modelo | Status |
|--------|--------|
| `nvidia/nemotron-3-ultra-550b-a55b` | ✅ 200 OK |
| `nvidia/nemotron-3-super-120b-a12b` | ✅ 200 OK |
| `nvidia/nemotron-3-nano-30b-a3b` | ✅ 200 OK |
| `nvidia/nemotron-nano-12b-v2-vl` | ✅ 200 OK |

### **Synthetic** (key: `syn_***` - formato `hf:owner/model`)
| Modelo | Status |
|--------|--------|
| `hf:zai-org/GLM-5.1` | ✅ 200 OK |
| `hf:openai/gpt-oss-120b` | ✅ 200 OK |

---

## ❌ PROBLEMAS IDENTIFICADOS

| Provider | Modelos | Problema | Solução |
|----------|---------|----------|---------|
| **OpenRouter (Venice)** | 18 modelos | **Rate Limited 429** (retry 4-28s) | Usar key própria com rate limits acumulados |
| **OpenCode Zen** | 8 modelos | **404 - Sem API pública** | Só funciona via OpenCode CLI, não API |
| **DeepSeek API** | 1 modelo | **401 Key inválida** | key expirada/inválida |
| **Synthetic (Together AI)** | 12 modelos | **404 Removidos do proxy** | Muitos modelos não mais suportados |

---

## 🔑 API KEYS ENCONTRADAS (rasc.md)

```
# OpenRouter (2 keys)
sk-or-v1-***  # "User not found"
sk-or-v1-***  # ✅ FUNCIONA

# NVIDIA
nvapi-***  # ✅ FUNCIONA

# OpenCode
sk-***  # Sem API pública

# DeepSeek
sk-***  # ❌ INVÁLIDA

# Synthetic
syn_***  # ✅ FUNCIONA (formato hf:owner/model)
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

- `E:\Hermes agent\opencode.json` - Config opencode com model default
- `E:\Hermes agent\scripts\test-free-models.ts` - Script de teste (não usado no final)
- `E:\Hermes agent\free-models-test-results.json` - Resultados salvos
- `E:\Hermes agent\WORKFLOW_RESTORE.md` - **ESTE ARQUIVO**

---

## 🎯 PRÓXIMOS PASSOS (AMANHÃ)

1. **Atualizar Unify Chat Provider config** com keys válidas:
   - OpenRouter: usar key própria
   - NVIDIA: usar key própria
   - Synthetic: usar key própria
   - Remover OpenCode Zen (sem API)
   - Corrigir DeepSeek (pegar key válida)

2. **Testar modelos rate-limited** com key própria OpenRouter

3. **Validar Nemotron Nano 9B v2** no NVIDIA direto (deu 404)

---

## 🔧 COMANDO PARA RESTAURAR CONTEXTO AMANHÃ

```bash
# No terminal (PowerShell):
cat E:\Hermes\ agent\WORKFLOW_RESTORE.md
```

Ou no VS Code: `code E:\Hermes\ agent\WORKFLOW_RESTORE.md`

---

## 📌 REGRAS INEGOCIÁVEIS (AGENTS.md)

1. **Deploy a cada alteração**: build → package → uninstall → install → reload
2. **QA antes de entregar**: fluxo completo + contratos + edge cases + build + testes
3. **NUNCA mexer no Unify Chat Provider** sem autorização verbal explícita
4. **Reabsorver regras** a cada nova sessão: AGENTS.md + copilot-instructions.md + EXTENSIONS_INTEGRATION.md