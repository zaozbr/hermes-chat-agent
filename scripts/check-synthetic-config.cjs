const fs = require('fs');
const c = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');

let i = c.indexOf('Synthetic');
let snippet = c.substring(i - 50, i + 500);
console.log('=== SYNTHETIC ENDPOINT HEADER ===');
console.log(snippet.substring(0, 300));

// Check for autoFetch flag
if (snippet.includes('autoFetch')) {
  let afIdx = snippet.indexOf('autoFetch');
  console.log('\nautoFetch found at:', afIdx);
  console.log(snippet.substring(afIdx, afIdx + 30));
}
