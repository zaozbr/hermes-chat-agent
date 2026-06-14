const fs = require('fs');
const c = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');

function findMatchingBracket(str, start, openB, closeB) {
  let d = 1, i = start + 1;
  while (i < str.length && d > 0) {
    if (str[i] === openB) d++;
    else if (str[i] === closeB) d--;
    i++;
  }
  return d === 0 ? i - 1 : -1;
}

let i = c.indexOf('Synthetic');
console.log('Synthetic section starts at char:', i);

// Find the models array
let arrStart = c.indexOf('[', i);
let arrEnd = findMatchingBracket(c, arrStart, '[', ']');
let section = c.substring(arrStart, arrEnd + 1);

console.log('Section length:', section.length);

// Find objects in array
let depth = 0, inStr = false, starts = [], ends = [];
for (let j = 0; j < section.length; j++) {
  if (section[j] === '"' && (j === 0 || section[j-1] !== '\\')) inStr = !inStr;
  if (inStr) continue;
  if (section[j] === '{') {
    if (depth === 0) starts.push(j);
    depth++;
  } else if (section[j] === '}') {
    depth--;
    if (depth === 0) ends.push(j);
  }
}

console.log('Models:', starts.length);

let lastObj;
if (starts.length > 0) {
  let lastIdx = starts.length - 1;
  let objText = section.substring(starts[lastIdx], ends[lastIdx] + 1);
  console.log('\nLast model object:');
  console.log(objText);
  
  // Show the array end
  console.log('\nText after last model (50 chars):');
  console.log(JSON.stringify(section.substring(ends[lastIdx], ends[lastIdx] + 50)));
  
  // Show the full array structure (compact)
  console.log('\nAll model IDs:');
  for (let j = 0; j < starts.length; j++) {
    let ot = section.substring(starts[j], ends[j] + 1);
    let idM = ot.match(/"id": "([^"]+)"/);
    let nameM = ot.match(/"name": "([^"]+)"/);
    if (idM) {
      let id = idM[1];
      // Skip preset template entries
      if (['high', 'medium', 'low', 'enabled', 'disabled', 'thinkingMode', 'reasoningEffort'].includes(id)) continue;
      console.log(`  [${j}] id: ${id}  name: ${nameM ? nameM[1] : '?'}`);
    }
  }
}
