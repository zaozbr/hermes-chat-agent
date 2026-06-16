/**
 * Test script that simulates exactly what the NoCreditLimit extension does.
 * This is identical to the applyPatch logic in extension.js.
 * Run with: node test-apply-patch.mjs
 * Restore with: rollback.ps1 restore
 */
import fs from 'fs';
import crypto from 'crypto';

const filePath = 'C:\\Users\\Usuario\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\93cfdd489c\\resources\\app\\extensions\\copilot\\dist\\extension.js';

console.log('=== Applying showQuotaExceededDialog no-op patch ===\n');

// Read
let content;
try {
  content = fs.readFileSync(filePath, 'utf-8');
} catch (err) {
  console.error('❌ Cannot read:', err.message);
  process.exit(1);
}

// Check if already patched
const NOOP_PATCHED = content.includes('showQuotaExceededDialog(e){return Promise.resolve()}') &&
  !content.includes('showQuotaExceededDialog(e){return cee.commands.executeCommand');

if (NOOP_PATCHED) {
  console.log('⏭️  Already patched. Nothing to do.');
  process.exit(0);
}

// Find and replace
const OLD_DIALOG = 'async showQuotaExceededDialog(e){return cee.commands.executeCommand(e.isNoAuthUser?"workbench.action.chat.triggerSetup":"workbench.action.chat.openQuotaExceededDialog")}';
const NEW_DIALOG = 'async showQuotaExceededDialog(e){return Promise.resolve()}';

if (!content.includes(OLD_DIALOG)) {
  console.error('❌ Pattern NOT found in bundle!');
  const idx = content.indexOf('showQuotaExceededDialog');
  if (idx >= 0) {
    console.log('Found showQuotaExceededDialog at', idx);
    console.log('Context:', content.substring(Math.max(0, idx - 20), Math.min(content.length, idx + 200)));
  }
  process.exit(1);
}

const BEFORE = content.length;
content = content.replace(OLD_DIALOG, NEW_DIALOG);
const AFTER = content.length;

// Verify
const VERIFY_ORIGINAL = content.includes(OLD_DIALOG);
const VERIFY_NOOP = content.includes('showQuotaExceededDialog(e){return Promise.resolve()}');
const VERIFY_EXECUTE = !content.includes('showQuotaExceededDialog(e){return cee.commands.executeCommand');

console.log('Original pattern found & replaced: ✅');
console.log('Size before:', BEFORE, '| after:', AFTER, '| diff:', BEFORE - AFTER);
console.log('Original still present:', VERIFY_ORIGINAL ? '❌' : '✅ (good)');
console.log('Noop version present:', VERIFY_NOOP ? '✅' : '❌');
console.log('executeCommand version removed:', VERIFY_EXECUTE ? '✅' : '❌');

// Count showQuotaExceededDialog calls (should still have 6 callers)
const callCount = [...content.matchAll(/showQuotaExceededDialog\(/g)].length;
console.log(`showQuotaExceededDialog() call sites remaining: ${callCount} (expected 6)`);

// Write
if (VERIFY_NOOP && !VERIFY_ORIGINAL) {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('\n✅ Patch written to disk successfully!');
  
  // Verify on disk
  const verifyContent = fs.readFileSync(filePath, 'utf-8');
  const diskOk = verifyContent.includes(NEW_DIALOG) && !verifyContent.includes(OLD_DIALOG);
  console.log('Disk verification:', diskOk ? '✅ PASS' : '❌ FAIL');
  
  const newHash = crypto.createHash('sha256').update(verifyContent).digest('hex');
  console.log('New SHA256:', newHash);
} else {
  console.log('\n❌ Verification FAILED - not writing to disk');
}
