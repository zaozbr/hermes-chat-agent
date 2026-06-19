# 🔄 Recovery: [FREE] DeepSeek V4 Flash Free (OpenCode Zen)

> **Só usar quando o DeepSeek V4 Flash Free parar de funcionar.**
> O problema SEMPRE é o mesmo: OpenAI SDK rejeita `apiKey` vazio, mas o servidor OpenCode Zen funciona **sem** `Authorization` header.

---

## Diagnóstico (2s)

Veja no Output Panel do Unify se aparecem estes erros:

```
[Auth:DeepSeek V4 Flash Free (openCode Zen) medium:api-key] Failed to resolve secret reference
Error: Missing credentials. Please pass an `apiKey`...
```

Se sim → vá para o **Fix**.

---

## Fix (30s)

### Passo 1: settings.json

Arquivo: `%APPDATA%\Code - Insiders\User\settings.json`

Encontre o endpoint `"DeepSeek V4 Flash Free (openCode Zen) medium"` e **garanta que o auth block seja**:

```json
"auth": {
    "method": "api-key",
    "apiKey": " "
},
```

> ⚠️ `"apiKey": " "` é um **espaço literal**, não string vazia `""`. Isso burla o check do OpenAI SDK (`!" "` é `false`) e o servidor aceita `Authorization: Bearer `.

### Passo 2: chat-completion-client.js

Arquivo: `%USERPROFILE%\.vscode-insiders\extensions\smallmain.vscode-unify-chat-provider-*\out\client\openai\chat-completion-client.js`

Encontre a linha:

```js
apiKey: token ?? '',
```

Troque para:

```js
apiKey: token ?? ' ',
```

Isso garante que **mesmo quando o UCPSECRET não for resolvido**, o SDK recebe um espaço (truthy) em vez de `''` (falsy → erro).

### Passo 3: GitHub Copilot API version (se der HTTP 400)

Arquivo: `%USERPROFILE%\.vscode-insiders\extensions\smallmain.vscode-unify-chat-provider-*\out\client\github-copilot\client.js`

Encontre e corrija:

```js
// ERRADO (data futura):
const COPILOT_API_VERSION = '2026-06-01';

// CERTO:
const COPILOT_API_VERSION = '2022-11-28';
```

### Passo 4: Reload Window

```powershell
Ctrl+Shift+P → "Developer: Reload Window"
```

---

## Verificação

Após o Reload Window, abra o Output Panel (`Ctrl+Shift+U`) selecione **Unify Chat Provider**. Deve aparecer:

```
[info] [req-1] ▶ Request started | Provider: DeepSeek V4 Flash Free (openCode Zen) medium ...
[info] [req-1] ✓ Request completed
```

Sem `[error] [Auth:DeepSeek...]` ou `Missing credentials`.

---

## Anatomia do problema (contexto)

```
POST https://opencode.ai/zen/v1/chat/completions
  Sem Authorization header        → 200 OK ✅
  Authorization: Bearer sk-...    → 401 ❌
  Authorization: Bearer (espaço)  → 200 OK ✅
```

O OpenAI SDK (`client.ts:434`) faz:
```js
if (!apiKey && !adminAPIKey && !workloadIdentity) throw ...
```

- `!''` → `true` → **erro** ❌
- `!' '` → `false` → **passa** ✅

Então o fix é **sempre garantir** que o `apiKey` nunca seja `''` — ou via settings.json com `" "` ou via patch do SDK com `token ?? ' '`.

---

## Backup de rollback

| Item | Localização |
|------|-------------|
| settings.json pré-fix | `E:\Hermes agent\.backups\settings.json.pre-fix.2026-06-18_200255.bak` |
| Snapshot settings.json | `E:\Hermes agent\.backups\settings.json.snapshot-20260618-202400.bak` |

Para restaurar:
```powershell
Copy-Item "E:\Hermes agent\.backups\settings.json.pre-fix.2026-06-18_200255.bak" "$env:APPDATA\Code - Insiders\User\settings.json" -Force
```
