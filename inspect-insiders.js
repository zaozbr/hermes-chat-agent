const fs = require('fs');
const path = require('path');

const filePath = 'E:\\Hermes agent\\extension-insiders.js';

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

// First, let's see the current state of the functions in this bundle
let match = content.match(/function N6e\([^)]+\)\{/);
console.log('N6e match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('N6e end:', end);
  console.log('N6e snippet:', content.substring(match.index, match.index + 100));
}

match = content.match(/function BDi\([^)]+\)\{/);
console.log('BDi match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('BDi end:', end);
  console.log('BDi snippet:', content.substring(match.index, match.index + 100));
}

match = content.match(/get isChatQuotaExceeded\(\)\{/);
console.log('getter match:', match ? match.index : 'NOT FOUND');
if (match) {
  const end = findFunctionEnd(content, match.index);
  console.log('getter end:', end);
  console.log('getter snippet:', content.substring(match.index, match.index + 100));
}