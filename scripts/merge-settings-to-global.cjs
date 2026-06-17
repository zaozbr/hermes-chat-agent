/**
 * Merge workspace .vscode/settings.json settings into global user settings.json
 * - Copies all keys from workspace settings into global settings
 * - Workspace values OVERWRITE global values for same keys
 * - Leaves workspace .vscode/settings.json untouched
 * - Preserves all existing global settings (Unify endpoints, etc.)
 */
const fs = require('fs');

const WORKSPACE_SETTINGS = 'E:/Hermes agent/.vscode/settings.json';
const GLOBAL_SETTINGS = 'C:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json';

function stripComments(jsonStr) {
  let result = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (esc) {
      result += ch;
      esc = false;
      continue;
    }
    if (inStr) {
      if (ch === '\\') {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      result += ch;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      result += ch;
      continue;
    }
    if (ch === '/' && jsonStr[i + 1] === '/') {
      while (i < jsonStr.length && jsonStr[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    if (ch === '/' && jsonStr[i + 1] === '*') {
      i += 2;
      while (i < jsonStr.length && !(jsonStr[i] === '*' && jsonStr[i + 1] === '/')) {
        if (jsonStr[i] === '\n') result += '\n';
        i++;
      }
      i++;
      continue;
    }
    result += ch;
  }
  return result;
}

console.log('Reading workspace settings...');
const workspace = JSON.parse(stripComments(fs.readFileSync(WORKSPACE_SETTINGS, 'utf8')));
console.log('Reading global settings...');
const global = JSON.parse(stripComments(fs.readFileSync(GLOBAL_SETTINGS, 'utf8')));

const wsKeys = Object.keys(workspace);
const globalKeysBefore = Object.keys(global).length;
let added = 0;
let overwritten = 0;

for (const [key, value] of Object.entries(workspace)) {
  if (key in global) {
    if (JSON.stringify(global[key]) !== JSON.stringify(value)) overwritten++;
  } else {
    added++;
  }
  global[key] = value;
}

const output = JSON.stringify(global, null, 2);
fs.writeFileSync(GLOBAL_SETTINGS, output, 'utf8');

console.log(`\n=== Merge Complete ===`);
console.log(`Workspace keys:     ${wsKeys.length}`);
console.log(`Global keys before: ${globalKeysBefore}`);
console.log(`Global keys after:  ${Object.keys(global).length}`);
console.log(`Added to global:    ${added}`);
console.log(`Overwritten:        ${overwritten}`);
console.log(`\n✅ Workspace settings COPIED to global successfully.`);
console.log(`ℹ️  Workspace .vscode/settings.json was NOT modified.`);
