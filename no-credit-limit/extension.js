const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// ─── Patch strategy ────────────────────────────────────────────
//
// PROBLEM (1): "Credit Limit Reached" MODAL POPUP appears when Copilot
//   detects quota exhaustion. Patched via `showQuotaExceededDialog`
//   which is the CENTRAL UI function that opens the popup.
//
// PROBLEM (2): "Credit Limit Reached" INLINE BANNER appears above the
//   chat input. This is controlled by context keys set by the Copilot
//   extension and the workbench core.
//
// PATCH A: `showQuotaExceededDialog` → no-op (blocks the modal popup)
// PATCH B: `_updateQuotaExceededContext` → always set context key to false
// PATCH C: `soe.onDidChange` → clamp percentRemaining to never be 0
//
// PATCH D: `xWe._render()` in workbench core JS → check notification text for "quota"
//   and suppress rendering. This blocks the chat input inline banner at the
//   widget level, independent of context keys or Copilot bundle code.
//   The xWe class is the ChatInputNotificationWidget in workbench.desktop.main.js.
//
// CRITICAL: NEVER patch `quotaExhausted` — returning false makes Copilot
//   believe credits exist, triggering API calls that fail and BREAK chat.
//
// SAFE SOLUTION: All patches are PURELY UI / context keys — no quota
//   logic changed, no return values altered, no API calls triggered.
//   The system continues to think quota is exhausted and behaves
//   normally, just the UI never shows the credit limit.
//
// Original PATCH A: async showQuotaExceededDialog(e){return cee.commands.executeCommand(...)}
// Patched PATCH A:  async showQuotaExceededDialog(e){return Promise.resolve()}
//
// Original PATCH B: lc.commands.executeCommand("setContext",c9n,t.isChatQuotaExceeded)
// Patched PATCH B:  lc.commands.executeCommand("setContext",c9n,!1)
//
// Original PATCH C: percentRemaining:o.percentRemaining
// Patched PATCH C:  percentRemaining:Math.max(1,o.percentRemaining??100)

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Find the Copilot extension dist file path.
 * VS Code now uses a versioned path: ...\<hash>\resources\app\extensions\copilot\dist\extension.js
 */
function getCopilotBundlePath() {
  const appRoot = vscode.env.appRoot;
  if (!appRoot) {
    throw new Error('Could not determine VS Code installation path (appRoot is empty)');
  }
  // Try the standard path first
  let bundlePath = path.join(appRoot, 'extensions', 'copilot', 'dist', 'extension.js');
  if (fs.existsSync(bundlePath)) {
    return bundlePath;
  }
  // Try the versioned path (VS Code 1.123+)
  const versionedRoot = path.join(path.dirname(appRoot), '..');
  const entries = fs.readdirSync(versionedRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && /^[a-f0-9]{10}$/.test(entry.name)) {
      const candidate = path.join(
        versionedRoot,
        entry.name,
        'resources',
        'app',
        'extensions',
        'copilot',
        'dist',
        'extension.js',
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  // Fallback to standard path
  return bundlePath;
}

/**
 * Check if all patches have already been applied.
 * We look for the patched versions of ALL three patches.
 */
function isAlreadyPatched(content) {
  // PATCH A: showQuotaExceededDialog → no-op
  const patchA =
    content.includes('showQuotaExceededDialog(e){return Promise.resolve()}') &&
    !content.includes('showQuotaExceededDialog(e){return cee.commands.executeCommand');

  // PATCH B: _updateQuotaExceededContext → always set !1
  const patchB =
    content.includes('lc.commands.executeCommand("setContext",c9n,!1)') &&
    !content.includes('lc.commands.executeCommand("setContext",c9n,t.isChatQuotaExceeded');

  // PATCH C: soe.onDidChange → clamp percentRemaining
  const patchC =
    content.includes('percentRemaining:Math.max(1,o.percentRemaining??100)') &&
    !content.includes('percentRemaining:o.percentRemaining');

  return patchA && patchB && patchC;
}

/**
 * Check if Patch D (workbench) has already been applied.
 */
function isWorkbenchPatched(content) {
  // PATCH D: xWe._render() → suppress quota notifications
  const patchD =
    content.includes('xWe=class extends k') &&
    content.includes('.match(/quota/i)');
  return patchD;
}

/**
 * Get the workbench core JS file path.
 */
function getWorkbenchBundlePath() {
  const appRoot = vscode.env.appRoot;
  if (!appRoot) {
    throw new Error('Could not determine VS Code installation path (appRoot is empty)');
  }
  return path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
}

/**
 * Apply the showQuotaExceededDialog patch to the Copilot bundle file.
 * Uses pure string replacement — NO brace-counting, NO regex on function bodies.
 * ONLY patches the real showQuotaExceededDialog function (not the mock/stub).
 * Returns true if patch was applied, false if already patched.
 * Throws on error.
 */
function applyPatch(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read Copilot bundle: ${err.message}`);
  }

  if (isAlreadyPatched(content)) {
    return false; // already patched
  }

  const warnings = [];
  let applied = false;

  // ─── PATCH A: showQuotaExceededDialog → no-op ──────────────
  // Handles BOTH states: original (not yet patched) and already patched.
  // Already patched (from previous session) → skip gracefully.

  const PATCH_A_ORIG =
    'async showQuotaExceededDialog(e){return cee.commands.executeCommand(e.isNoAuthUser?"workbench.action.chat.triggerSetup":"workbench.action.chat.openQuotaExceededDialog")}';
  const PATCH_A_DONE = 'async showQuotaExceededDialog(e){return Promise.resolve()}';

  if (content.includes(PATCH_A_ORIG)) {
    content = content.replace(PATCH_A_ORIG, PATCH_A_DONE);
    console.log('[NoCreditLimit] PATCH A applied: showQuotaExceededDialog → noop');
    applied = true;
  } else if (content.includes(PATCH_A_DONE)) {
    console.log('[NoCreditLimit] PATCH A already applied (skipping)');
  } else {
    warnings.push('PATCH A (showQuotaExceededDialog): neither original nor patched found');
  }

  // ─── PATCH B: _updateQuotaExceededContext → always set !1 ──
  // This blocks the context key from ever being set to TRUE.
  // Check if already patched first, then try original.

  const PATCH_B_ORIG = 'lc.commands.executeCommand("setContext",c9n,t.isChatQuotaExceeded)';
  const PATCH_B_DONE = 'lc.commands.executeCommand("setContext",c9n,!1)';

  if (content.includes(PATCH_B_DONE) && !content.includes(PATCH_B_ORIG)) {
    console.log('[NoCreditLimit] PATCH B already applied (skipping)');
  } else if (content.includes(PATCH_B_ORIG)) {
    content = content.replace(PATCH_B_ORIG, PATCH_B_DONE);
    console.log('[NoCreditLimit] PATCH B applied: _updateQuotaExceededContext → always !1');
    applied = true;
  } else {
    warnings.push('PATCH B (_updateQuotaExceededContext): pattern not found in bundle');
  }

  // ─── PATCH C: soe.onDidChange → clamp percentRemaining ─────
  // Prevents percentRemaining from being 0 (which triggers the banner
  // in the workbench core via updateContextKeys).

  const PATCH_C_ORIG = 'percentRemaining:o.percentRemaining';
  const PATCH_C_DONE = 'percentRemaining:Math.max(1,o.percentRemaining??100)';

  if (content.includes(PATCH_C_DONE) && !content.includes(PATCH_C_ORIG)) {
    console.log('[NoCreditLimit] PATCH C already applied (skipping)');
  } else if (content.includes(PATCH_C_ORIG)) {
    content = content.replace(PATCH_C_ORIG, PATCH_C_DONE);
    console.log('[NoCreditLimit] PATCH C applied: percentRemaining clamped');
    applied = true;
  } else {
    warnings.push('PATCH C (percentRemaining): pattern not found in bundle');
  }

  // Write the patched file (even if no new patches, to sync state)
  fs.writeFileSync(filePath, content, 'utf-8');

  if (warnings.length > 0) {
    console.warn('[NoCreditLimit] Warnings: ' + warnings.join(' | '));
  }

  if (!applied) {
    console.log('[NoCreditLimit] No new patches needed (all already applied or patterns missing)');
  }

  return applied;
}

/**
 * Apply Patch D to the workbench core JS file.
 * Patches the xWe class _render() method to check notification text for "quota"
 * keywords and suppress rendering if matched.
 */
function applyWorkbenchPatch(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read workbench bundle: ${err.message}`);
  }

  if (isWorkbenchPatched(content)) {
    return false; // already patched
  }

  // ─── PATCH D: xWe._render() → suppress quota notifications ──
  // The _render() method currently is:
  //   _render(){this._contentDisposables.clear(),gt(this.domNode);
  //   let e=this._notificationService.getActiveNotification(t=>this._matchesSession(t));
  //   if(!e){this.domNode.parentElement?.classList.remove("has-notification");return}
  //   this.domNode.parentElement?.classList.add("has-notification"),this._renderNotification(e)}
  //
  // Patched version adds a text check: if the notification message contains "quota"
  // (case-insensitive), treat it as if no notification exists.

  // The exact original pattern we need to find and replace:
  const PATCH_D_ORIG =
    '_render(){this._contentDisposables.clear(),gt(this.domNode);let e=this._notificationService.getActiveNotification(t=>this._matchesSession(t));if(!e){this.domNode.parentElement?.classList.remove("has-notification");return}this.domNode.parentElement?.classList.add("has-notification"),this._renderNotification(e)}';

  const PATCH_D_DONE =
    '_render(){this._contentDisposables.clear(),gt(this.domNode);let e=this._notificationService.getActiveNotification(t=>this._matchesSession(t));if(!e||(typeof e.message=="string"?e.message:e.message?.value||"").match(/quota/i)){this.domNode.parentElement?.classList.remove("has-notification");return}this.domNode.parentElement?.classList.add("has-notification"),this._renderNotification(e)}';

  if (content.includes(PATCH_D_ORIG)) {
    content = content.replace(PATCH_D_ORIG, PATCH_D_DONE);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('[NoCreditLimit] PATCH D applied: xWe._render() checks notification text for quota');
    return true;
  } else if (content.includes('.match(/quota/i)')) {
    console.log('[NoCreditLimit] PATCH D already applied (skipping)');
    return false;
  } else {
    console.warn('[NoCreditLimit] PATCH D (xWe._render): original pattern not found in workbench core');
    // Try a longer search to find the exact variant
    const xWeIdx = content.indexOf('xWe=class extends k');
    if (xWeIdx !== -1) {
      const snippet = content.substring(xWeIdx, xWeIdx + 3000);
      const renderIdx = snippet.indexOf('_render(){');
      if (renderIdx !== -1) {
        const renderStart = xWeIdx + renderIdx;
        const renderEnd = snippet.indexOf('rerender', renderIdx);
        if (renderEnd !== -1) {
          const actualRender = content.substring(renderStart, xWeIdx + renderEnd);
          console.warn(`[NoCreditLimit] Found _render() variant at offset ${renderStart}: ${actualRender.substring(0, 200)}...`);
        }
      }
    }
    return false;
  }
}

/**
 * Verify Patch D on workbench core.
 */
function verifyWorkbenchPatch(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const patchD = isWorkbenchPatched(content);
    const xWeFound = content.includes('xWe=class extends k');
    return {
      patched: patchD,
      fileExists: true,
      fileSize: content.length,
      xWeFound: xWeFound,
      notificationTextChecked: patchD,
    };
  } catch {
    return { patched: false, fileExists: false, fileSize: 0 };
  }
}

/**
 * Verify all patches are correctly applied.
 */
function verifyPatch(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const patchA = content.includes('showQuotaExceededDialog(e){return Promise.resolve()}');
    const patchB = content.includes('lc.commands.executeCommand("setContext",c9n,!1)');
    const patchC = content.includes('percentRemaining:Math.max(1,o.percentRemaining??100)');
    const allPatched = patchA && patchB && patchC;
    return {
      patched: allPatched,
      fileExists: true,
      fileSize: content.length,
      showQuotaExceededNoop: patchA,
      contextKeyPatched: patchB,
      percentClamped: patchC,
    };
  } catch {
    return { patched: false, fileExists: false, fileSize: 0 };
  }
}

// ─── Extension activation ──────────────────────────────────────

let statusBarItem;

function activate(context) {
  console.log('[NoCreditLimit] Activating...');

  // Add status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'noCreditLimit.check';
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('noCreditLimit.patch', async () => {
      await runPatch();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noCreditLimit.check', async () => {
      await checkStatus();
    }),
  );

  // Apply patch on activation
  runPatch();
}

function deactivate() {
  // Nothing to clean up
}

async function runPatch() {
  try {
    const filePath = getCopilotBundlePath();
    console.log(`[NoCreditLimit] Target: ${filePath}`);

    const filePath = getCopilotBundlePath();
    const workbenchPath = getWorkbenchBundlePath();

    // --- Patch workbench core (Patch D) first ---
    const wbResult = verifyWorkbenchPatch(workbenchPath);
    if (wbResult.fileExists && !wbResult.patched) {
      const wbPatched = applyWorkbenchPatch(workbenchPath);
      if (wbPatched) {
        console.log('[NoCreditLimit] Workbench Patch D applied successfully!');
      }
    } else if (wbResult.patched) {
      console.log('[NoCreditLimit] Workbench Patch D already applied.');
    } else if (!wbResult.fileExists) {
      console.warn(`[NoCreditLimit] Workbench file not found: ${workbenchPath}`);
    }

    // --- Patch Copilot bundle (Patches A/B/C) ---
    const result = verifyPatch(filePath);
    if (result.patched) {
      console.log('[NoCreditLimit] All Copilot patches already applied.');
      const status = [];
      if (result.showQuotaExceededNoop) status.push('A=noop');
      if (result.contextKeyPatched) status.push('B=ctx!1');
      if (result.percentClamped) status.push('C=clamped');
      if (wbResult.patched) status.push('D=textcheck');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = `Patches: ${status.join(', ')}. Crédito/banner suprimido.`;
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
      return;
    }

    if (!result.fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const patched = applyPatch(filePath);
    if (patched) {
      console.log('[NoCreditLimit] All Copilot patches applied successfully!');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = 'Patches A+B+C+D aplicados. Popup + banner suprimidos.';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();

      vscode.window.showInformationMessage(
        'No Credit Limit: 4 patches aplicados. Popup (A) + banner inline (B+C+D) suprimidos.',
        'OK',
      );
    } else {
      console.log('[NoCreditLimit] Already patched.');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = 'Patches already applied.';
      statusBarItem.show();
    }
  } catch (err) {
    console.error(`[NoCreditLimit] Patch failed: ${err.message}`);
    statusBarItem.text = '$(warning) No Credit Limit';
    statusBarItem.tooltip = `Patch failed: ${err.message}. Run "No Credit Limit: Reaplicar patch"`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
  }
}

async function checkStatus() {
  try {
    const filePath = getCopilotBundlePath();
    const result = verifyPatch(filePath);

    const filePath = getCopilotBundlePath();
    const workbenchPath = getWorkbenchBundlePath();

    const wbResult = verifyWorkbenchPatch(workbenchPath);

    if (result.patched) {
      const parts = [];
      if (result.showQuotaExceededNoop) parts.push('A=popup✅');
      if (result.contextKeyPatched) parts.push('B=banner✅');
      if (result.percentClamped) parts.push('C=quota✅');
      if (wbResult.patched) parts.push('D=textcheck✅');
      vscode.window.showInformationMessage(
        `✅ No Credit Limit: ${parts.join(', ')}. Popup + banner suprimidos (lógica intacta).`,
        'OK',
      );
    } else if (!result.fileExists) {
      const action = await vscode.window.showWarningMessage(
        '❌ No Credit Limit: Arquivo do Copilot não encontrado. O VS Code pode ter mudado de versão.',
        'Reaplicar',
      );
      if (action === 'Reaplicar') {
        await runPatch();
      }
    } else {
      const missing = [];
      if (!result.showQuotaExceededNoop) missing.push('A');
      if (!result.contextKeyPatched) missing.push('B');
      if (!result.percentClamped) missing.push('C');
      if (!wbResult.patched) missing.push('D');
      const action = await vscode.window.showWarningMessage(
        `⚠️ No Credit Limit: Patch(es) ${missing.join(', ')} NÃO aplicado(s). Banner pode aparecer.`,
        'Aplicar patch',
      );
      if (action === 'Aplicar patch') {
        await runPatch();
      }
    }
  } catch (err) {
    vscode.window.showErrorMessage(`No Credit Limit: Erro ao verificar status: ${err.message}`);
  }
}

module.exports = {
  activate,
  deactivate,
};
