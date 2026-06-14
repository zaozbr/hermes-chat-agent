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
console.log('Section length:', section.length);

// Extract names and ids
let names = section.match(/"name": "([^"]+)"/g);
let ids = section.match(/"id": "([^"]+)"/g);
console.log('Names found:', names ? names.length : 0);
console.log('IDs found:', ids ? ids.length : 0);

if (ids) {
  let modelIds = ids.map(x => x.replace('"id": "', '').replace('"', ''));
  let modelNames = names ? names.map(x => x.replace('"name": "', '').replace('"', '')) : [];
  console.log('\nConfigured OpenRouter models:');
  for (let i = 0; i < modelIds.length; i++) {
    let name = modelNames[i] || '(no name)';
    let id = modelIds[i];
    let hasFree = name.startsWith('[FREE]') ? '✅' : '❌ no prefix';
    console.log('  ' + hasFree + ' ' + id + '  ->  ' + name);
  }
}
