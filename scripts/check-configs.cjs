const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json','utf8');

// Find NVIDIA section
let idx = content.indexOf('"Nvidia"');
let snippet = content.substring(Math.max(0,idx-100), idx+2000);
console.log('=== NVIDIA CONFIG ===');
// extract model ids
const nvLines = snippet.split('\n');
nvLines.forEach(l => {
  const m = l.match(/"id": "([^"]+)"/);
  if (m) console.log('  model:', m[1]);
});
console.log('');

// Find Synthetic section after "Synthetic"
idx = content.indexOf('"Synthetic"');
snippet = content.substring(idx, idx+4000);
console.log('=== SYNTHETIC CONFIGURED MODELS ===');
const synLines = snippet.split('\n');
let inSynth = false;
synLines.forEach(l => {
  const m = l.match(/"id": "([^"]+)"/);
  if (m) console.log('  model:', m[1]);
  // stop at next endpoint
  if (l.includes('"type"') && !l.includes('Synthetic')) inSynth = false;
});
