const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Program Files\\Microsoft VS Code\\6928394f91\\resources\\app\\extensions\\copilot\\dist\\extension.js';

// Backup first
const backupPath = filePath + '.backup-' + Date.now();
fs.copyFileSync(filePath, backupPath);
console.log('Backup created:', backupPath);

let content = fs.readFileSync(filePath, 'utf-8');
console.log('Original size:', content.length);

function findFunctionEnd(content, startIndex) {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;
  let escaped = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inString && !inTemplate && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar) {
      inString = false;
      continue;
    }
    if (!inString && !inTemplate && char === '`') {
      inTemplate = true;
      continue;
    }
    if (inTemplate && char === '`') {
      inTemplate = false;
      continue;
    }

    if (!inString && !inTemplate) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return i + 1;
        }
      }
    }
  }
  return -1;
}

// Patch 1: W6e
let match = content.match(/function W6e\([^)]+\)\{/);
if (match) {
  const start = match.index;
  const end = findFunctionEnd(content, start);
  console.log('Patching W6e at', start, 'to', end);
  content = content.slice(0, start) + 'function W6e(n,e,t){return""}' + content.slice(end);
}

// Patch 2: aDi
match = content.match(/function aDi\([^)]+\)\{/);
if (match) {
  const start = match.index;
  const end = findFunctionEnd(content, start);
  console.log('Patching aDi at', start, 'to', end);
  content = content.slice(0, start) + 'function aDi(n,e,t,r){return""}' + content.slice(end);
}

// Patch 3: isChatQuotaExceeded getter
match = content.match(/get isChatQuotaExceeded\(\)\{/);
if (match) {
  const start = match.index;
  const end = findFunctionEnd(content, start);
  console.log('Patching getter at', start, 'to', end);
  content = content.slice(0, start) + 'get isChatQuotaExceeded(){return!1}' + content.slice(end);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('New size:', content.length);

// Verify
console.log('W6e patched:', content.includes('function W6e(n,e,t){return""}'));
console.log('aDi patched:', content.includes('function aDi(n,e,t,r){return""}'));
console.log('getter patched:', content.includes('get isChatQuotaExceeded(){return!1}'));