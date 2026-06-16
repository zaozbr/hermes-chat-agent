const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// ─── Patch strategy ────────────────────────────────────────────
//
// PROBLEM: "Credit Limit Reached" popup appears when Copilot detects
//   quota exhaustion. Previous attempts to patch error-handler functions
//   (aDi, W6e, N6e, BDi) BROKE the chat because those functions are
//   central to all error handling.
//
// SOLUTION: Patch ONLY the `quotaExhausted` getter — the master flag
//   that controls whether credit-limit popups appear. This is a ONE-LINE
//   boolean flip: instead of the complex logic checking percentRemaining,
//   we simply make it always return `false`.
//
// Original:  get quotaExhausted(){return!this._quotaInfo||...percentRemaining<=0}
// Patched:   get quotaExhausted(){return!1}
//
// CSS-equivalent: This is the JS equivalent of "height:0; opacity:0" —
//   we prevent the popup from ever rendering instead of hiding it after
//   the fact. No function bodies replaced, no brace counting, no risk
//   of breaking the chat.

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
 * Check if the quotaExhausted patch has already been applied.
 */
function isAlreadyPatched(content) {
  // Patched version: simplified getter that always returns false
  return (
    content.includes('get quotaExhausted(){return!1}') &&
    !content.includes('get quotaExhausted(){return!this._quotaInfo')
  );
}

/**
 * Apply the quotaExhausted patch to the Copilot bundle file.
 * Uses pure string replacement — NO brace-counting, NO regex on function bodies.
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

  // ─── Patch quotaExhausted getter (force false) ─────────────
  // This is the master flag that controls whether credit-limit popups appear.
  // Original:
  //   get quotaExhausted(){return!this._quotaInfo||this._quotaInfo.additionalUsageEnabled?!1:this._quotaInfo.unlimited?!this._quotaInfo.hasQuota:this._quotaInfo.percentRemaining<=0}
  // Patched:
  //   get quotaExhausted(){return!1}

  const OLD_QUOTA =
    'get quotaExhausted(){return!this._quotaInfo||this._quotaInfo.additionalUsageEnabled?!1:this._quotaInfo.unlimited?!this._quotaInfo.hasQuota:this._quotaInfo.percentRemaining<=0}';

  if (!content.includes(OLD_QUOTA)) {
    throw new Error(
      'Could not find quotaExhausted getter. Bundle may have changed. ' +
        'Expected pattern not found.',
    );
  }
  content = content.replace(OLD_QUOTA, 'get quotaExhausted(){return!1}');

  // Write the patched file
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

/**
 * Verify the patch is correctly applied.
 */
function verifyPatch(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const patched = isAlreadyPatched(content);
    return {
      patched,
      fileExists: true,
      fileSize: content.length,
      quotaExhaustedSimplified: patched,
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

    const result = verifyPatch(filePath);
    if (result.patched) {
      console.log('[NoCreditLimit] Patch already applied.');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = 'quotaExhausted=false. Credit limit popup suppressed.';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
      return;
    }

    if (!result.fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const patched = applyPatch(filePath);
    if (patched) {
      console.log('[NoCreditLimit] Patch applied successfully!');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = 'quotaExhausted=false. Credit limit popup suppressed.';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();

      vscode.window.showInformationMessage(
        'No Credit Limit: quotaExhausted=false. Credit limit popup suppressed.',
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

    if (result.patched) {
      vscode.window.showInformationMessage(
        '✅ No Credit Limit: quotaExhausted=false. Popup de crédito suprimido.',
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
      const action = await vscode.window.showWarningMessage(
        '⚠️ No Credit Limit: Patch NÃO aplicado. Popup de crédito pode aparecer.',
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
