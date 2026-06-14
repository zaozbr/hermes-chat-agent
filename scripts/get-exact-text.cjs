const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');

// From find-boundaries: last [FREE] ends at 66503, first #1 starts at 66514
const lastFreeEnd = 66503;
const firstDupStart = 66514;
const arrEnd = 76946;

// Show exact text from boundary to array end
let toRemove = content.substring(lastFreeEnd, arrEnd + 1);
console.log('=== TEXT TO REMOVE (will be shown in full) ===');
console.log('Length:', toRemove.length);
console.log('---[START]---');
console.log(toRemove);
console.log('---[END]---');

// Show just the separator between last [FREE] and first #1
console.log('\n=== EXACT SEPARATOR TEXT ===');
console.log(JSON.stringify(content.substring(lastFreeEnd, firstDupStart)));
