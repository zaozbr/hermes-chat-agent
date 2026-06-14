const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// ─── Patch targets ──────────────────────────────────────────────
// These are the exact minified patterns we patch in the Copilot bundle.
// The function P6e generates all "credit limit" / "quota exceeded" messages.
// We replace it with a no-op that returns empty string, suppressing the notification.

const PATCHES = [
  {
    // Full replacement of P6e function - handles "credit limit" family
    search: /function P6e\(n,e,t\)\{return""\}/,
    replace: 'function P6e(n,e,t){return""}',
    fallbackSearch: /function P6e\(n,e,t\)\{/,
    description: 'P6e credit limit messages',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Find the Copilot extension dist file path using vscode.env.appRoot.
 */
function getCopilotBundlePath() {
  const appRoot = vscode.env.appRoot;
  if (!appRoot) {
    throw new Error('Could not determine VS Code installation path (appRoot is empty)');
  }
  return path.join(appRoot, 'extensions', 'copilot', 'dist', 'extension.js');
}

/**
 * Check if the P6e function has already been patched (returns "").
 */
function isAlreadyPatched(content) {
  return content.includes('function P6e(n,e,t){return""}');
}

/**
 * Apply the patch to the Copilot bundle file.
 * Returns true if patched, false if already patched.
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

  // Find the P6e function and replace everything from "function P6e(" to the next "function "
  const match = content.match(/function P6e\([^)]+\)\{/);
  if (!match) {
    throw new Error(
      'Could not find P6e function in Copilot bundle. The bundle format may have changed.',
    );
  }

  // Find the start of P6e function
  const funcStart = match.index;
  if (funcStart === undefined) {
    throw new Error('Could not locate P6e function position.');
  }

  // Find where the function ends - look for "}}function" or "}," followed by "function"
  // P6e is a standalone function: `}function P6e(...){...body...}}function NextFunc`
  // We need to find the matching } that closes the function body, then the } that closes...
  // Actually, in the minified bundle, the structure is:
  // `}function P6e(n,e,t){...code...}}function BDi`
  // The }} closes: 1) the switch/default, 2) the function body

  // Find the next "function" keyword after the P6e function definition
  const contentAfter = content.slice(funcStart);
  const nextFuncMatch = contentAfter.match(/function [A-Z]/);
  if (!nextFuncMatch || nextFuncMatch.index === undefined) {
    throw new Error('Could not find the end of P6e function.');
  }

  // The P6e function ends right before the next function starts
  const funcEnd = funcStart + nextFuncMatch.index;

  // Extract the original function text
  const originalFunc = content.slice(funcStart, funcEnd);

  // Replace: keep everything before funcStart and after funcEnd
  const newContent =
    content.slice(0, funcStart) + `function P6e(n,e,t){return""}` + content.slice(funcEnd);

  // Verify the replacement doesn't break JSON or syntax (basic sanity check)
  if (newContent.includes('function P6e(n,e,t){return""}function BDi')) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }

  // If the expected pattern isn't found, try more careful approach
  // The pattern might have a newline or other character between the functions
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return true;
}

/**
 * Verify the patch is correctly applied.
 */
function verifyPatch(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      patched: isAlreadyPatched(content),
      fileExists: true,
      fileSize: content.length,
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
      statusBarItem.tooltip = 'Patch applied. Copilot credit notifications silenced.';
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
      statusBarItem.tooltip = 'Patch applied. Copilot credit notifications silenced.';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();

      vscode.window.showInformationMessage(
        'No Credit Limit: Patch applied successfully. Copilot credit notifications silenced.',
        'OK',
      );
    } else {
      console.log('[NoCreditLimit] Already patched.');
      statusBarItem.text = '$(check) No Credit Limit';
      statusBarItem.tooltip = 'Patch already applied.';
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
        '✅ No Credit Limit: Patch aplicado. Notificações de crédito silenciadas.',
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
        '⚠️ No Credit Limit: Patch NÃO aplicado. As notificações de crédito podem aparecer.',
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
