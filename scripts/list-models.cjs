const fs = require('fs');
const path = require('path');

const userDir = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Code - Insiders', 'User');
const raw = fs.readFileSync(path.join(userDir, 'settings.json'), 'utf8');

// Find the endpoints array
const startMarker = '"unifyChatProvider.endpoints"';
const startIdx = raw.indexOf(startMarker);
if (startIdx < 0) {
  console.log('Not found');
  process.exit(1);
}

const bracketStart = raw.indexOf('[', startIdx);
let depth = 0;
let inString = false;
let escape = false;
let endIdx = -1;
for (let i = bracketStart; i < raw.length; i++) {
  const ch = raw[i];
  if (escape) {
    escape = false;
    continue;
  }
  if (inString) {
    if (ch === '\\') {
      escape = true;
    } else if (ch === '"') {
      inString = false;
    }
    continue;
  }
  if (ch === '"') {
    inString = true;
    continue;
  }
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

const endpointsJson = raw.substring(bracketStart, endIdx);
const eps = JSON.parse(endpointsJson);

console.log('Total endpoints: ' + eps.length + '\n');

eps.forEach((ep, i) => {
  const models = ep.models || [];
  const freeModels = models.filter(
    (m) =>
      (m.id && m.id.toLowerCase().includes('free')) ||
      (m.name && m.name.toLowerCase().includes('free')),
  );
  console.log(
    i +
      '. ' +
      ep.name +
      ' (' +
      ep.type +
      ') - ' +
      models.length +
      ' models' +
      (freeModels.length ? ' [FREE: ' + freeModels.length + ']' : ''),
  );
});

// Show free model details
console.log('\n=== FREE MODELS DETAILS ===\n');
eps.forEach((ep, i) => {
  const models = ep.models || [];
  const freeModels = models.filter(
    (m) =>
      (m.id && m.id.toLowerCase().includes('free')) ||
      (m.name && m.name.toLowerCase().includes('free')),
  );
  if (freeModels.length > 0) {
    console.log('--- ' + ep.name + ' ---');
    freeModels.forEach((m) => {
      console.log('  Model: ' + (m.name || m.id));
      console.log('  ID: ' + (m.id || 'N/A'));
      console.log('  Auth: ' + (ep.auth?.method || 'N/A'));
      console.log('  BaseURL: ' + (ep.baseUrl || 'N/A'));
      console.log('');
    });
  }
});
