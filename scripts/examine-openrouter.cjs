const fs = require('fs');
const c = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');

function findMatchingBracket(str, start, openBracket, closeBracket) {
  let depth = 1;
  let i = start + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === openBracket) depth++;
    else if (str[i] === closeBracket) depth--;
    i++;
  }
  return depth === 0 ? i - 1 : -1;
}

let idx = c.indexOf('OpenRouter');
let s = c.indexOf('[', idx);
let e = findMatchingBracket(c, s, '[', ']');
let section = c.substring(s, e + 1);

// Show the structure - find all top-level objects
let depth = 0;
let inString = false;
let objectStarts = [];
let objectEnds = [];

for (let i = 0; i < section.length; i++) {
  if (section[i] === '"' && (i === 0 || section[i-1] !== '\\')) {
    inString = !inString;
    continue;
  }
  if (inString) continue;
  
  if (section[i] === '{') {
    if (depth === 0) objectStarts.push(i);
    depth++;
  } else if (section[i] === '}') {
    depth--;
    if (depth === 0) objectEnds.push(i);
  }
}

console.log('Total top-level objects:', objectStarts.length);
console.log('');

// For each object, extract its model id/name
for (let o = 0; o < objectStarts.length; o++) {
  let obj = section.substring(objectStarts[o], objectEnds[o] + 1);
  let idMatch = obj.match(/"id":\s*"([^"]+)"/);
  let nameMatch = obj.match(/"name":\s*"([^"]+)"/);
  let id = idMatch ? idMatch[1] : '?';
  let name = nameMatch ? nameMatch[1] : '?';
  
  // Check if it has presetTemplates (not a model but a template container)
  let hasPresetTemplates = obj.includes('presetTemplates');
  let maxTokens = obj.match(/"maxInputTokens":\s*(\d+)/);
  
  console.log(
    '  [' + o + '] ' +
    'id: ' + id.padEnd(40) + 
    '  name: ' + (name.startsWith('[FREE]') ? '✅ ' : '  ') + name.substring(0,40).padEnd(42) +
    (maxTokens ? ' maxTokens:' + maxTokens[1] : '') +
    (hasPresetTemplates ? ' [has presets]' : '')
  );
}
