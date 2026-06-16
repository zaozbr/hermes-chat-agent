import fs from 'fs';

const filePath = 'C:\\Users\\Usuario\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\93cfdd489c\\resources\\app\\extensions\\copilot\\dist\\extension.js';
let content = fs.readFileSync(filePath, 'utf-8');

const OLD_DIALOG = 'async showQuotaExceededDialog(e){return cee.commands.executeCommand(e.isNoAuthUser?"workbench.action.chat.triggerSetup":"workbench.action.chat.openQuotaExceededDialog")}';
const NEW_DIALOG = 'async showQuotaExceededDialog(e){return Promise.resolve()}';

console.log('=== Testing patch pattern ===');
console.log('Bundle size:', content.length, 'bytes');

if (content.includes(OLD_DIALOG)) {
  const count = content.split(OLD_DIALOG).length - 1;
  console.log('FOUND', count, 'occurrence(s) of original showQuotaExceededDialog');
  content = content.replace(OLD_DIALOG, NEW_DIALOG);
  
  console.log('Original present:', content.includes(OLD_DIALOG) ? '❌ YES (wrong!)' : '✅ NO (good)');
  console.log('Noop present:', content.includes(NEW_DIALOG) ? '✅ YES (good)' : '❌ NO (wrong!)');
  
  // Verify we didn't accidentally modify anything else
  if (content.includes('showQuotaExceededDialog')) {
    const matches = [...content.matchAll(/showQuotaExceededDialog\([^)]+\)/g)];
    console.log('\nAll showQuotaExceededDialog calls now:');
    matches.forEach((m, i) => console.log(`  ${i+1}. ${m[0].substring(0, 80)}...`));
  }
} else {
  console.log('❌ Pattern NOT FOUND in bundle');
  console.log('Trying fuzzy search for showQuotaExceededDialog...');
  const idx = content.indexOf('showQuotaExceededDialog');
  if (idx >= 0) {
    const start = Math.max(0, idx - 10);
    const end = Math.min(content.length, idx + 200);
    console.log('Found at index', idx);
    console.log('Full context:', content.substring(start, end));
  }
}
