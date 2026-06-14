const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json','utf8');

// Get OpenRouter section - everything from 'OpenRouter' baseUrl to the closing bracket
let idx = content.indexOf('OpenRouter');
let modelsStart = content.indexOf('[', idx);
let modelsEnd = content.indexOf(']', modelsStart) + 1;
let section = content.substring(modelsStart, modelsEnd);

// Extract all model ids and names
const nameRegex = /"name": "([^"]+)"/g;
let match;
let names = [];
while ((match = nameRegex.exec(section)) !== null) {
  names.push(match[1]);
}

const idRegex = /"id": "([^"]+)"/g;
let ids = [];
while ((match = idRegex.exec(section)) !== null) {
  ids.push(match[1]);
}

console.log('Configured OpenRouter models (' + names.length + '):');
for (let i = 0; i < names.length; i++) {
  console.log('  [' + i + '] ' + (names[i] || '?') + '  ->  ' + (ids[i] || '?'));
}

// Now check synthetic section too
console.log('\n=== Synthetic models ===');
idx = content.indexOf('"Synthetic"');
modelsStart = content.indexOf('[', idx);
let synthSnippet = content.substring(modelsStart, modelsStart + 3000);
let synthEnd = synthSnippet.indexOf(']');
synthSnippet = synthSnippet.substring(0, synthEnd + 1);

let synthIds = [];
let synthMatch;
let synthIdRegex = /"id": "([^"]+)"/g;
while ((synthMatch = synthIdRegex.exec(synthSnippet)) !== null) {
  synthIds.push(synthMatch[1]);
}
console.log('Synthetic model IDs:', synthIds.filter(id => !['high','medium','low','enabled','disabled','thinkingMode','reasoningEffort'].includes(id)));

// Check NVIDIA models count
console.log('\n=== NVIDIA models ===');
idx = content.indexOf('"Nvidia"');
modelsStart = content.indexOf('[', idx);
let nvSnippet = content.substring(modelsStart, modelsStart + 500);
let nvEnd = nvSnippet.indexOf(']');
if (nvEnd > 0) nvSnippet = nvSnippet.substring(0, nvEnd + 1);
let nvCount = (nvSnippet.match(/"id": "/g) || []).length;
console.log('NVIDIA model count:', nvCount);
