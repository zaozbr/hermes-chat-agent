# 🔄 Recovery: [FREE] DeepSeek V4 Flash Free (OpenCode Zen)

> **Só usar quando o DeepSeek V4 Flash Free parar de funcionar.**
> O problema SEMPRE é o mesmo: OpenAI SDK rejeita `apiKey` vazio, mas o servidor
> OpenCode Zen funciona **sem** `Authorization` header (ou com `Bearer ` vazio).

---

## Diagnóstico Rápido (5s)

Abra o **Output Panel** (`Ctrl+Shift+U`) → selecione **Unify Chat Provider**.
Se vir estes erros, o fix é necessário:

```
[Auth:DeepSeek V4 Flash Free (openCode Zen) medium:api-key] Failed to resolve secret reference
Error: Missing credentials. Please pass an `apiKey`...
```

**Causa raiz (sempre uma destas):**
1. `settings.json` → auth do endpoint **não tem** `"apiKey": " "`
2. `chat-completion-client.js` → `token ?? ''` em vez de `token ?? ' '`
3. (ocasional) `github-copilot/client.js` → `COPILOT_API_VERSION` é data futura

---

## 🔧 Fix Manual (3 passos, 60s)

### Passo 1: settings.json — Usar auth method "none"

Arquivo: `%APPDATA%\Code - Insiders\User\settings.json`

Encontre o endpoint `"DeepSeek V4 Flash Free (openCode Zen) medium"` e
**garanta que o auth block seja**:

```json
"auth": {
    "method": "none"
}
```

> ⚠️ `"method": "none"` é CRÍTICO. O modelo é aberto, não precisa de API key.
> Com `"api-key"` o servidor identifica a request e aplica rate limit por IP/key.
> Com `"none"` a request é anônima — sem rate limit.

**Arquitetura (por que isso funciona):**

```
settings.json auth: {method: "none"}
  → service.resolveCredential()
    → auth.method === "none" → {kind: "none"}
  → getToken({kind: "none"}) → undefined
  → buildHeaders()
    → token undefined → NENHUM Authorization header
  → createClient()
    → apiKey: undefined ?? ' ' → ' ' (truthy → SDK aceita, sem auth header)
  → POST https://opencode.ai/zen/v1/chat/completions
    → SEM Authorization header → servidor trata como anônimo → sem rate limit ✅
```

### Passo 2: chat-completion-client.js — Garantir fallback " "

Arquivo: `%USERPROFILE%\.vscode-insiders\extensions\smallmain.vscode-unify-chat-provider-7.6.0\out\client\openai\chat-completion-client.js`

**Localize** (linha ~116):

```js
apiKey: token ?? '',
```

**Corrija para:**

```js
apiKey: token ?? ' ',
```

Isso é a **rede de segurança**: mesmo quando o token resolve como `undefined`
(por falha de resolvedor de UCPSECRET ou auth incompleto), o OpenAI SDK recebe
um espaço em vez de string vazia. O SDK faz `if (!apiKey) throw`:
- `!''` → `true` → **ERRO** ❌
- `!' '` → `false` → **PASSA** ✅

### Passo 3: GitHub Copilot API version (se der HTTP 400)

Arquivo: `%USERPROFILE%\.vscode-insiders\extensions\smallmain.vscode-unify-chat-provider-7.6.0\out\client\github-copilot\client.js`

**Verifique** (linha ~47):

```js
// CERTO:
const COPILOT_API_VERSION = '2022-11-28';

// ERRADO (data futura que causa HTTP 400):
const COPILOT_API_VERSION = '2026-06-01';
```

### Passo 4: Reload Window

```powershell
Ctrl+Shift+P → "Developer: Reload Window"
```

---

## 🤖 Fix Automático (PowerShell, 10s)

Criar script `recover-deepseek.ps1` em `E:\Hermes agent\scripts\`:

```powershell
param(
    [string]$SettingsPath = "$env:APPDATA\Code - Insiders\User\settings.json",
    [string]$ExtensionDir = "$env:USERPROFILE\.vscode-insiders\extensions"
)

Write-Host "=== 🔄 DeepSeek V4 Flash Free Recovery ===" -ForegroundColor Cyan

# 1. Find the extension
$ext = Get-ChildItem "$ExtensionDir\smallmain.vscode-unify-chat-provider-*" -Directory |
       Sort-Object Name -Descending | Select-Object -First 1
if (-not $ext) { Write-Host "❌ Extension not found!" -ForegroundColor Red; exit 1 }
Write-Host "✓ Extension: $($ext.Name)" -ForegroundColor Green

# 2. Fix settings.json
$settings = Get-Content $SettingsPath -Raw | ConvertFrom-Json
$fixed = $false
for ($i = 0; $i -lt $settings.unifyChatProvider.endpoints.Count; $i++) {
    $ep = $settings.unifyChatProvider.endpoints[$i]
    if ($ep.name -eq "DeepSeek V4 Flash Free (openCode Zen) medium") {
        if ($ep.auth.apiKey -ne " ") {
            $settings.unifyChatProvider.endpoints[$i].auth | Add-Member -NotePropertyName "apiKey" -NotePropertyValue " " -Force
            $fixed = $true
            Write-Host "✓ Fixed settings.json: added apiKey space" -ForegroundColor Green
        } else {
            Write-Host "✓ settings.json already correct" -ForegroundColor Green
        }
    }
}
if ($fixed) {
    $settings | ConvertTo-Json -Depth 100 | Set-Content $SettingsPath -Force
    Write-Host "✓ settings.json saved" -ForegroundColor Green
}

# 3. Fix chat-completion-client.js
$clientFile = Join-Path $ext.FullName "out\client\openai\chat-completion-client.js"
if (Test-Path $clientFile) {
    $content = Get-Content $clientFile -Raw
    if ($content -match "token \?\? ''") {
        $content = $content -replace "token \?\? ''", "token ?? ' '"
        Set-Content $clientFile -Value $content -Force
        Write-Host "✓ Fixed chat-completion-client.js: token ?? ' '" -ForegroundColor Green
    } elseif ($content -match "token \?\? ' '") {
        Write-Host "✓ chat-completion-client.js already correct" -ForegroundColor Green
    } else {
        Write-Host "⚠ Could not find token ?? pattern in chat-completion-client.js" -ForegroundColor Yellow
    }
}

# 4. Fix COPILOT_API_VERSION
$copilotFile = Join-Path $ext.FullName "out\client\github-copilot\client.js"
if (Test-Path $copilotFile) {
    $content = Get-Content $copilotFile -Raw
    if ($content -match "COPILOT_API_VERSION = '2026-") {
        $content = $content -replace "COPILOT_API_VERSION = '2026-[^']*'", "COPILOT_API_VERSION = '2022-11-28'"
        Set-Content $copilotFile -Value $content -Force
        Write-Host "✓ Fixed COPILOT_API_VERSION" -ForegroundColor Green
    } elseif ($content -match "COPILOT_API_VERSION = '2022-11-28'") {
        Write-Host "✓ COPILOT_API_VERSION already correct" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== ✅ Recovery complete! ===" -ForegroundColor Cyan
Write-Host "👉 Ctrl+Shift+P → 'Developer: Reload Window'" -ForegroundColor Yellow
```

Para executar:
```powershell
powershell -ExecutionPolicy Bypass -File "E:\Hermes agent\scripts\recover-deepseek.ps1"
```

---

## 🧪 Verificação

Após Reload Window, abra Output Panel (`Ctrl+Shift+U`) → **Unify Chat Provider**.
Teste com qualquer mensagem no chat. Deve aparecer:

```
[info] [req-1] ▶ Request started | Provider: DeepSeek V4 Flash Free (openCode Zen) medium ...
[info] [req-1] ✓ Request completed
```

Sem `[error] [Auth:...]` ou `Missing credentials`.

---

## 🏗 Anatomia Completa do Problema

### Stack de chamadas

```
VS Code Chat request
  → Unify Chat Provider (extension.ts)
    → service.resolveCredential("DeepSeek V4 Flash Free...")
      → ConfigStore.getProvider("DeepSeek V4 Flash Free...")
        → Lê de settings.json → unifyChatProvider.endpoints[6]
          → auth: {method: "api-key", apiKey: " "}
      → AuthManager.getCredential("DeepSeek V4 Flash Free...")
        → api-key provider.getCredential()
          → apiKey = " " (truthy) → retorna {value: " "}
      → toAuthTokenInfo({value: " "})
        → !" " é false → retorna {kind: "token", token: " "}
    → chat-completion-client.createClient(credential={kind:"token", token:" "})
      → getToken(credential) → " " (truthy)
      → buildHeaders → Authorization: Bearer
      → new OpenAI({ apiKey: " " }) → SDK aceita (!" " é false)
    → POST https://opencode.ai/zen/v1/chat/completions
      → Sem Authorization header significativo → servidor aceita
      → 200 OK ✅
```

### Mapa completo de arquivos alterados

| Arquivo | Linha | O que faz | Por que precisa |
|---------|-------|-----------|-----------------|
| `%APPDATA%\Code - Insiders\User\settings.json` | auth.apiKey | Fornece apiKey=" " para o provider | Sem isso, credential resolve como {kind:'none'} |
| `out/client/openai/chat-completion-client.js` | 116 | `apiKey: token ?? ' '` | Safety net: se token for undefined, SDK recebe espaço |
| `out/client/github-copilot/client.js` | 47 | `COPILOT_API_VERSION` | Versão futura da API causa HTTP 400 |

### Por que VS Code Insiders updates quebram

Atualizações do VS Code Insiders **reinstalam a extensão Unify Chat Provider**,
substituindo os arquivos em `out/` pelos originais do .vsix:
- `chat-completion-client.js` → perde o patch `token ?? ' '`
- `github-copilot/client.js` → COPILOT_API_VERSION volta para data futura

O `settings.json` **não é afetado** por updates (é do usuário), então o Passo 1
só precisa ser feito uma vez. Mas os Passos 2-3 precisam ser refeitos.

---

## 📦 Backups Disponíveis

| Item | Localização |
|------|-------------|
| settings.json pós-fix (2026-06-19) | `E:\Hermes agent\.backups\settings.json.fixed-with-apikey-space.2026-06-19.bak` |
| settings.json pré-fix (2026-06-18) | `E:\Hermes agent\.backups\settings.json.pre-fix.2026-06-18_200255.bak` |
| Snapshot settings.json | `E:\Hermes agent\.backups\settings.json.snapshot-20260618-202400.bak` |

Para restaurar:
```powershell
Copy-Item "E:\Hermes agent\.backups\settings.json.fixed-with-apikey-space.2026-06-19.bak" "$env:APPDATA\Code - Insiders\User\settings.json" -Force
```

---

## 📋 Checklist de Auto-Recovery

Quando o DeepSeek parar, **sempre** verificar nesta ordem:

- [ ] `settings.json` → `apiKey: " "` existe no auth do endpoint free?
- [ ] `chat-completion-client.js` → `token ?? ' '` em vez de `token ?? ''`?
- [ ] `github-copilot/client.js` → `COPILOT_API_VERSION = '2022-11-28'`?
- [ ] Rodou `Reload Window` depois dos fixes?
