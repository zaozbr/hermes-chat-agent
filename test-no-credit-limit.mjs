import fs from 'fs';
import vm from 'vm';

// Read the extension code
let code = fs.readFileSync('no-credit-limit/extension.js', 'utf8');

// Remove 'const vscode = require' since we'll pass vscode directly
code = code.replace("const vscode = require('vscode')", '// vscode injected');

// Mock vscode
const mockVscode = {
  window: {
    createStatusBarItem: function() {
      return {
        text: '',
        command: '',
        tooltip: '',
        show: function(){},
        dispose: function(){}
      };
    },
    showInformationMessage: function(){},
    showErrorMessage: function(){},
    createOutputChannel: function(){
      return { appendLine: function(){}, show: function(){} };
    }
  },
  commands: {
    registerCommand: function(){ return {dispose: function(){}}; }
  },
  workspace: {
    getConfiguration: function(){
      return { get: function(){return null}, update: function(){} };
    }
  },
  StatusBarAlignment: { Right: 1, Left: 2 }
};

const mockModules = { vscode: mockVscode, fs: fs, path: await import('path') };

const mod = { exports: {} };
vm.runInNewContext(code, {
  require: function(id) {
    if (mockModules[id]) return mockModules[id];
    if (id === 'vscode') return mockVscode;
    const m = require(id);
    return m;
  },
  module: mod,
  exports: mod.exports,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Buffer: Buffer,
  __dirname: import.meta.dirname,
  __filename: 'no-credit-limit/extension.js'
}, { filename: 'extension.js', timeout: 5000 });

const ext = mod.exports;
console.log('Module loaded OK');
console.log('activate function: ' + (typeof ext.activate));
console.log('deactivate function: ' + (typeof ext.deactivate));

// Now test the bundle
const bundlePath = 'C:\\Users\\Usuario\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\fd0fbb3f5b\\resources\\app\\extensions\\copilot\\dist\\extension.js';

if (!fs.existsSync(bundlePath)) {
  console.log('BUNDLE NOT FOUND at: ' + bundlePath);
  process.exit(1);
}

const bundle = fs.readFileSync(bundlePath, 'utf8');
console.log('Bundle size: ' + (bundle.length / 1024 / 1024).toFixed(2) + ' MB');

const oldStr = 'get quotaExhausted(){return!this._quotaInfo||this._quotaInfo.additionalUsageEnabled?!1:this._quotaInfo.unlimited?!this._quotaInfo.hasQuota:this._quotaInfo.percentRemaining<=0}';
const newStr = 'get quotaExhausted(){return!1}';

const idx = bundle.indexOf(oldStr);
console.log('quotaExhausted pattern found at index: ' + idx);

if (idx >= 0) {
  console.log('Context before patch:');
  console.log('...[' + bundle.substring(Math.max(0, idx-80), idx) + ']');
  console.log('>>>>[' + bundle.substring(idx, idx + oldStr.length) + ']<<<<');
  console.log('');
  console.log('After replacement would be:');
  console.log('...[' + bundle.substring(Math.max(0, idx-80), idx) + ']');
  console.log('>>>>[' + newStr + ']<<<<');

  // Verify uniqueness
  const idx2 = bundle.indexOf(oldStr, idx + 1);
  console.log('');
  console.log('Second occurrence: ' + idx2);
  if (idx2 === -1) console.log('Pattern is UNIQUE - safe to patch!');

  // Verify the extension's patch logic
  const patchedBundle = bundle.substring(0, idx) + newStr + bundle.substring(idx + oldStr.length);
  console.log('Patched size: ' + (patchedBundle.length / 1024 / 1024).toFixed(2) + ' MB');
  console.log('Old pattern in patched: ' + patchedBundle.includes(oldStr));
  console.log('New pattern in patched: ' + patchedBundle.includes('get quotaExhausted(){return!1}'));

  // Verify structure around the patch
  const context = bundle.substring(idx - 200, idx + oldStr.length + 200);
  // Count opening braces before the patch point in the context
  let braceCount = 0;
  for (let i = 0; i < 200; i++) {
    const c = context[i];
    if (c === '{') braceCount++;
    if (c === '}') braceCount--;
  }
  console.log('Relative brace balance before patch: ' + braceCount);

  // Check it's inside class XZ
  const beforeText = bundle.substring(Math.max(0, idx - 500), idx);
  const classMatch = beforeText.match(/class\s+(\w+)/g);
  console.log('Classes near patch: ' + (classMatch ? classMatch.join(', ') : 'none'));
} else {
  console.log('PATTERN NOT FOUND! Searching for quotaExhausted...');
  const altIdx = bundle.indexOf('quotaExhausted');
  if (altIdx >= 0) {
    console.log('Found quotaExhausted at ' + altIdx + ':');
    console.log(bundle.substring(altIdx, altIdx + 300));
  } else {
    console.log('quotaExhausted not in bundle at all!');
  }
}

console.log('');
console.log('=== TEST COMPLETE ===');
