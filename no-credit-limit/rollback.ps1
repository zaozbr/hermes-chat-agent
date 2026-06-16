<#
.SYNOPSIS
    Rollback do patch No-Credit-Limit no bundle do Copilot
.DESCRIPTION
    Script standalone de segurança. Cria backup do extension.js original do Copilot
    e permite restaurar caso a extensão No-Credit-Limit quebre o chat.
    
    Modos de uso:
      .\rollback.ps1 status       — mostra status atual (patched/backup/restored)
      .\rollback.ps1 backup       — força backup mesmo se já existir
      .\rollback.ps1 restore      — restaura backup se existir
      .\rollback.ps1 (sem args)   — mesmo que status
#>

param(
    [ValidateSet('status','backup','restore')]
    [string]$Action = 'status'
)

# ─── Config ──────────────────────────────────────────────────────
$BACKUP_DIR = Join-Path $PSScriptRoot ".backups"
$COPIHOT_BUNDLE = "extension.js"

# ─── Helpers ─────────────────────────────────────────────────────

function Find-AllCopilotBundles {
    Write-Host "[INFO] Procurando bundles do Copilot..." -ForegroundColor Cyan
    $bundles = @()
    
    $versionedRoot = "C:\Users\Usuario\AppData\Local\Programs\Microsoft VS Code Insiders"
    if (Test-Path $versionedRoot) {
        $dirs = Get-ChildItem -Path $versionedRoot -Directory | Where-Object { $_.Name -match '^[a-f0-9]{10}$' }
        foreach ($d in $dirs) {
            $candidate = Join-Path $d.FullName "resources\app\extensions\copilot\dist\extension.js"
            if (Test-Path $candidate) {
                Write-Host "[INFO] Bundle encontrado: $candidate" -ForegroundColor Green
                $bundles += @{Path = $candidate; Hash = $d.Name; Size = (Get-Item $candidate).Length}
            }
        }
    }
    
    $direct = "C:\Users\Usuario\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app\extensions\copilot\dist\extension.js"
    if (Test-Path $direct) {
        Write-Host "[INFO] Bundle encontrado (direct): $direct" -ForegroundColor Green
        $bundles += @{Path = $direct; Hash = "direct"; Size = (Get-Item $direct).Length}
    }
    
    if ($bundles.Count -eq 0) {
        Write-Host "[WARN] Busca recursiva..." -ForegroundColor Yellow
        $found = Get-ChildItem -Path "C:\Users\Usuario\AppData\Local\Programs\Microsoft VS Code Insiders" -Recurse -Filter "extension.js" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match 'extensions\\copilot\\dist\\extension\.js$' } |
            Select-Object -First 1
        if ($found) {
            Write-Host "[INFO] Bundle encontrado (recursive): $($found.FullName)" -ForegroundColor Green
            $bundles += @{Path = $found.FullName; Hash = "recursive"; Size = (Get-Item $found.FullName).Length}
        }
    }
    
    if ($bundles.Count -eq 0) {
        throw "COPS_BUNDLE_NOT_FOUND: Nenhum bundle do Copilot encontrado."
    }
    
    return $bundles
}

function Get-BackupPath {
    param([string]$BundlePath)
    
    $bundleDir = Split-Path $BundlePath -Parent
    $backupFile = Join-Path $bundleDir "extension.js.original.backup"
    return $backupFile
}

function New-BackupDir {
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -Path $BACKUP_DIR -ItemType Directory -Force | Out-Null
    }
}

function Test-BackupIntegrity {
    param([string]$BackupPath)
    
    if (-not (Test-Path $BackupPath)) {
        return $false
    }
    
    $backupSize = (Get-Item $BackupPath).Length
    Write-Host "[INFO] Backup size: $backupSize bytes" -ForegroundColor Gray
    
    # Backup deve ter pelo menos 10MB (o bundle tem ~20MB)
    return $backupSize -gt 10MB
}

# ─── Commands ────────────────────────────────────────────────────

function Show-Status {
    Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   No-Credit-Limit Rollback — Status            ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    try {
        $bundles = Find-AllCopilotBundles
        Write-Host "[INFO] $($bundles.Count) bundle(s) encontrado(s):" -ForegroundColor Cyan
        
        $allOk = $true
        foreach ($bundle in $bundles) {
            Write-Host "`n── $($bundle.Hash) ─────────────────────" -ForegroundColor Magenta
            Write-Host "[OK] Path: $($bundle.Path)" -ForegroundColor Green
            Write-Host "[INFO] Size: $([math]::Round($bundle.Size/1MB, 2)) MB" -ForegroundColor Gray
            
            # Backup in-place
            $backupInPlace = Get-BackupPath -BundlePath $bundle.Path
            $hasBackup = Test-Path $backupInPlace
            $backupOk = $hasBackup -and (Test-BackupIntegrity -BackupPath $backupInPlace)
            Write-Host "[BACKUP] In-place: $(if($backupOk){'✅ VÁLIDO'}elseif($hasBackup){'⚠️ CORROMPIDO'}else{'❌ NÃO EXISTE'})" -ForegroundColor $(if($backupOk){'Green'}elseif($hasBackup){'Yellow'}else{'Red'})
            
            # Status do patch (detecta TODOS os tipos de patch)
            $content = Get-Content -Path $bundle.Path -Raw
            $patchedQuota = $content -match 'get quotaExhausted\(\)\{return!1\}' -and -not ($content -match 'get quotaExhausted\(\)\{return!this\._quotaInfo')
            $patchA = $content -match 'showQuotaExceededDialog\(e\)\{return Promise\.resolve\(\)\}' -and -not ($content -match 'showQuotaExceededDialog\(e\)\{return cee\.commands\.executeCommand')
            $patchB = $content -match 'setContext",c9n,!1' -and -not ($content -match 'setContext",c9n,t\.isChatQuotaExceeded')
            $patchC = $content -match 'percentRemaining:Math\.max\(1,o\.percentRemaining\?\?100\)' -and -not ($content -match 'percentRemaining:o\.percentRemaining(?![?(])')
            $patches = @()
            if ($patchedQuota) { $patches += "⚠️ quotaExhausted=return!1 (QUEBRA CHAT)" }
            if ($patchA) { $patches += "A=noop" }
            if ($patchB) { $patches += "B=ctx!1" }
            if ($patchC) { $patches += "C=clamped" }
            if ($patches.Count -gt 0) {
                Write-Host "[PATCH] ⚠️ APLICADO(S): $($patches -join ', ')" -ForegroundColor $(if($patchedQuota){'Red'}else{'Yellow'})
            } else {
                Write-Host "[PATCH] ✅ ORIGINAL (não patched)" -ForegroundColor Green
            }
            
            if (-not $backupOk) { $allOk = $false }
        }
        
        # Resumo
        Write-Host "`n📋 RESUMO:" -ForegroundColor Cyan
        if ($allOk) {
            Write-Host "  ✅ Todos os bundles com backup válido." -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Alguns bundles sem backup. Execute: .\rollback.ps1 backup" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
        exit 1
    }
}

function Do-Backup {
    Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Criando Backup de TODOS os Bundles Copilot    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    try {
        $bundles = Find-AllCopilotBundles
        $count = 0
        
        foreach ($bundle in $bundles) {
            $bundlePath = $bundle.Path
            $hash = $bundle.Hash
            Write-Host "`n── Bundle $hash ──" -ForegroundColor Magenta
            
            # Backup in-place (mesmo diretório)
            $backupInPlace = Get-BackupPath -BundlePath $bundlePath
            
            if ((Test-Path $backupInPlace) -and (Test-BackupIntegrity -BackupPath $backupInPlace)) {
                Write-Host "[INFO] Backup in-place já existe: $backupInPlace" -ForegroundColor Green
            } else {
                Write-Host "[INFO] Criando backup in-place..." -ForegroundColor Yellow
                Copy-Item -Path $bundlePath -Destination $backupInPlace -Force
                if (Test-BackupIntegrity -BackupPath $backupInPlace) {
                    Write-Host "[OK] Backup in-place criado: $backupInPlace" -ForegroundColor Green
                } else {
                    Write-Host "[ERROR] Falha no backup in-place de $hash" -ForegroundColor Red
                    continue
                }
            }
            
            # Backup adicional no diretório de backups
            New-BackupDir
            $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
            $backupDirFile = Join-Path $BACKUP_DIR "extension.js.$hash.$timestamp.backup"
            if (-not (Test-Path $backupDirFile)) {
                Copy-Item -Path $bundlePath -Destination $backupDirFile
                Write-Host "[OK] Backup adicional: $backupDirFile" -ForegroundColor Green
            }
            
            $count++
        }
        
        Write-Host "`n✅ BACKUP CONCLUÍDO — $count bundle(s)" -ForegroundColor Green
        
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
        exit 1
    }
}

function Do-Restore {
    Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Restaurando TODOS os Bundles Copilot          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    try {
        $bundles = Find-AllCopilotBundles
        $restored = 0
        $failed = 0
        
        foreach ($bundle in $bundles) {
            $bundlePath = $bundle.Path
            $hash = $bundle.Hash
            Write-Host "`n── Bundle $hash ──" -ForegroundColor Magenta
            Write-Host "[INFO] Path: $bundlePath" -ForegroundColor Gray
            
            $backupInPlace = Get-BackupPath -BundlePath $bundlePath
            
            # Tenta backup in-place primeiro
            $restoreFrom = $null
            
            if (Test-Path $backupInPlace) {
                if (Test-BackupIntegrity -BackupPath $backupInPlace) {
                    $restoreFrom = $backupInPlace
                    Write-Host "[INFO] Usando backup in-place" -ForegroundColor Green
                } else {
                    Write-Host "[WARN] Backup in-place corrompido" -ForegroundColor Yellow
                }
            }
            
            # Fallback: backup específico deste hash no diretório
            if (-not $restoreFrom) {
                New-BackupDir
                $specificBackup = Get-ChildItem -Path $BACKUP_DIR -Filter "*$hash*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                if ($specificBackup) {
                    $restoreFrom = $specificBackup.FullName
                    Write-Host "[INFO] Usando backup específico: $restoreFrom" -ForegroundColor Green
                }
            }
            
            # Fallback: qualquer backup no diretório
            if (-not $restoreFrom) {
                $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "*.backup" | Sort-Object LastWriteTime -Descending
                if ($backups.Count -gt 0) {
                    $restoreFrom = $backups[0].FullName
                    Write-Host "[WARN] Usando backup genérico: $restoreFrom" -ForegroundColor Yellow
                }
            }
            
            if (-not $restoreFrom) {
                Write-Host "[ERROR] Nenhum backup válido para $hash" -ForegroundColor Red
                $failed++
                continue
            }
            
            # Verifica integridade do backup
            $backupSize = (Get-Item $restoreFrom).Length
            $bundleSize = (Get-Item $bundlePath).Length
            Write-Host "[INFO] Backup: $([math]::Round($backupSize/1MB,2)) MB | Atual: $([math]::Round($bundleSize/1MB,2)) MB" -ForegroundColor Gray
            
            # Calcula hash SHA256
            $backupHash = (Get-FileHash -Path $restoreFrom -Algorithm SHA256).Hash
            Write-Host "[INFO] Backup SHA256: $backupHash" -ForegroundColor Gray
            
            # Restaura
            Write-Host "[INFO] Restaurando..." -ForegroundColor Yellow
            Copy-Item -Path $restoreFrom -Destination $bundlePath -Force
            
            # Verifica pós-restore
            $newHash = (Get-FileHash -Path $bundlePath -Algorithm SHA256).Hash
            if ($newHash -eq $backupHash) {
                Write-Host "[OK] Restaurado com sucesso! SHA256 confere." -ForegroundColor Green
                $restored++
                
                # Remove backup in-place
                if (Test-Path $backupInPlace) {
                    Remove-Item -Path $backupInPlace -Force
                }
            } else {
                Write-Host "[ERROR] Hash não confere!" -ForegroundColor Red
                $failed++
            }
        }
        
        Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor $(if($failed -eq 0){'Green'}else{'Yellow'})
        Write-Host "║   RESUMO: $restored restaurado(s), $failed falha(s)      ║" -ForegroundColor $(if($failed -eq 0){'Green'}else{'Yellow'})
        Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor $(if($failed -eq 0){'Green'}else{'Yellow'})
        
        if ($restored -gt 0) {
            Write-Host ""
            Write-Host "⚠️  PARA APLICAR A MUDANÇA:" -ForegroundColor Yellow
            Write-Host "   1. Pressione Ctrl+Shift+P → 'Developer: Reload Window'" -ForegroundColor Yellow
            Write-Host "   2. Ou feche e abra o VS Code Insiders novamente" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
        exit 1
    }
}

# ─── Main ────────────────────────────────────────────────────────

switch ($Action) {
    'status'  { Show-Status }
    'backup'   { Do-Backup }
    'restore'  { Do-Restore }
}
