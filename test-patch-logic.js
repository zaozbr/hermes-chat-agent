const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Program Files\\Microsoft VS Code\\6928394f91\\resources\\app\\extensions\\copilot\\dist\\extension.js';

let content = fs.readFileSync(filePath, 'utf-8');
console.log('File size:', content.length);

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

// Test W6e
let match = content.match(/function W6e\([^)]+\)\{/);
console.log('W6e match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('W6e end:', end);
  console.log('W6e length:', end - match.index);
  console.log('W6e snippet:', content.substring(match.index, match.index + 100));
}

// Test aDi
match = content.match(/function aDi\([^)]+\)\{/);
console.log('aDi match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('aDi end:', end);
  console.log('aDi length:', end - match.index);
  console.log('aDi snippet:', content.substring(match.index, match.index + 100));
}

// Test getter
match = content.match(/get isChatQuotaExceeded\(\)\{/);
console.log('getter match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('getter end:', end);
  console.log('getter length:', end - match.index);
  console.log('getter snippet:', content.substring(match.index, match.index + 100));
}