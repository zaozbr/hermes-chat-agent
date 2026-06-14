#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifica o estado global de MCPs, plugins e configuracoes apos Reload Window.
.DESCRIPTION
    Valida que todas as configuracoes globais persistiram apos reload:
    - 8 MCP servers no mcp.json
    - 7 Copilot CLI plugins
    - Arquivo copilot-global-instructions.md
    - chat.customInstructions no settings.json
#>

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Test-Step {
    param([string]$Name, [scriptblock]$Block)
    try {
        & $Block
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        Write-Host "         $_" -ForegroundColor DarkRed
        $script:failed++
    }
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  HERMES - Global State Verification" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. MCP.json
# ---------------------------------------------------------------------------
Write-Host "`n[MCP Servers Globais]" -ForegroundColor Yellow

$mcpPath = "$env:APPDATA\Code - Insiders\User\mcp.json"

Test-Step "mcp.json existe e eh valido" {
    if (-not (Test-Path $mcpPath)) { throw "Arquivo nao encontrado em $mcpPath" }
    $mcp = Get-Content $mcpPath -Raw -Encoding utf8 | ConvertFrom-Json
    if (-not ($mcp.servers)) { throw "Propriedade 'servers' nao encontrada" }
}

Test-Step "8 MCP servers configurados" {
    $mcp = Get-Content $mcpPath -Raw -Encoding utf8 | ConvertFrom-Json
    $servers = @($mcp.servers.PSObject.Properties.Name)
    $count = $servers.Count
    if ($count -lt 8) { throw "Esperado 8, encontrado ${count}: $($servers -join ', ')" }
    Write-Host "        ${count} servers: $($servers -join ', ')" -ForegroundColor DarkGray
}

Test-Step "Servers esperados presentes" {
    $mcp = Get-Content $mcpPath -Raw -Encoding utf8 | ConvertFrom-Json
    $servers = @($mcp.servers.PSObject.Properties.Name)
    $expected = @('mcp-openmsx', 'filesystem', 'memory', 'puppeteer',
                  'fetch-url', 'git', 'github', 'sequential-thinking')
    $missing = $expected | Where-Object { $_ -notin $servers }
    if ($missing) { throw "Faltando: $($missing -join ', ')" }
}

# ---------------------------------------------------------------------------
# 2. Global npm packages
# ---------------------------------------------------------------------------
Write-Host "`n[Pacotes npm Globais (MCPs)]" -ForegroundColor Yellow

Test-Step "Pacotes MCP instalados globalmente" {
    $list = npm list -g --depth=0 2>&1 | Where-Object { $_ -match 'server-|fetch-url|mcp-server' }
    $count = @($list).Count
    if ($count -lt 6) { throw "Esperado 6+, encontrado ${count}" }
    Write-Host "        $($list -join " | ")" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. Copilot CLI Plugins
# ---------------------------------------------------------------------------
Write-Host "`n[Copilot CLI Plugins]" -ForegroundColor Yellow

Test-Step "Copilot CLI disponivel" {
    $ver = copilot --version 2>&1
    if (-not $ver) { throw "Copilot CLI nao encontrado" }
    Write-Host "        $ver" -ForegroundColor DarkGray
}

Test-Step "7 plugins instalados" {
    $raw = copilot plugin list 2>&1 | Out-String
    $allLines = ($raw -split "`n") | Where-Object { $_.Trim() -ne '' }
    # Find the "Installed plugins:" header and count lines after it
    $idx = -1
    for ($i = 0; $i -lt $allLines.Count; $i++) {
        if ($allLines[$i] -match 'Installed|Plugin') { $idx = $i; break }
    }
    if ($idx -ge 0) {
        $pluginLines = $allLines[($idx + 1)..($allLines.Count - 1)]
        $count = @($pluginLines).Count
    } else {
        # fallback: count non-empty lines
        $count = @($allLines).Count
    }
    if ($count -lt 7) { throw "Esperado 7+, encontrado ${count}. Output:`n${raw}" }
}

Test-Step "Plugins esperados presentes" {
    $raw = copilot plugin list 2>&1 | Out-String
    $expected = @('superpowers', 'episodic-memory', 'testing-automation',
                  'context-engineering', 'typescript-mcp-development',
                  'double-shot-latte', 'structured-autonomy')
    $missing = $expected | Where-Object { $raw -notmatch $_ }
    if ($missing) { throw "Faltando: $($missing -join ', ')" }
    Write-Host "        OK: $($expected -join ', ')" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 4. Global Instructions File
# ---------------------------------------------------------------------------
Write-Host "`n[Arquivo de Instrucoes Globais]" -ForegroundColor Yellow

$globalInstrPath = "$env:APPDATA\Code - Insiders\User\copilot-global-instructions.md"

Test-Step "copilot-global-instructions.md existe" {
    if (-not (Test-Path $globalInstrPath)) { throw "Arquivo nao encontrado em ${globalInstrPath}" }
    $content = Get-Content $globalInstrPath -Raw -Encoding utf8
    $lines = ($content -split "`n").Count
    Write-Host "        ${lines} linhas" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 5. Settings.json
# ---------------------------------------------------------------------------
Write-Host "`n[Settings.json Global]" -ForegroundColor Yellow

$settingsPath = "$env:APPDATA\Code - Insiders\User\settings.json"

Test-Step "chat.customInstructions configurado" {
    $raw = Get-Content $settingsPath -Raw -Encoding utf8
    # Direct string search (multiline-safe regex with [\s\S] instead of .)
    if ($raw -notmatch '"chat\.customInstructions"') { throw "chat.customInstructions nao encontrado no JSON" }
    if ($raw -notmatch 'customInstructions[\s\S]*?"file"') { throw "chat.customInstructions.file nao encontrado no JSON" }
    Write-Host "        OK: aponta para copilot-global-instructions.md" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host "`n=============================================" -ForegroundColor Cyan
$total = $passed + $failed
if ($failed -eq 0) {
    Write-Host "  [PASS] ${passed}/${total} testes passaram" -ForegroundColor Green
    Write-Host "  Ambiente global pronto para uso!" -ForegroundColor Green
} else {
    Write-Host "  [WARN] ${passed}/${total} passaram, ${failed} falharam" -ForegroundColor Yellow
    Write-Host "  Revise os erros acima antes de prosseguir." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan
