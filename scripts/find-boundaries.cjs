const fs = require('fs');
function findBracket(str, start, o, c) {
  let d = 1, i = start + 1;
  while (i < str.length && d > 0) {
    if (str[i] === o) d++;
    else if (str[i] === c) d--;
    i++;
  }
  return d === 0 ? i - 1 : -1;
}

const content = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');

// OpenRouter section
let idx = content.indexOf('OpenRouter');
let arrStart = content.indexOf('[', idx);
let arrEnd = findBracket(content, arrStart, '[', ']');
let section = content.substring(arrStart, arrEnd + 1);

// Find object boundaries
let depth = 0, inStr = false, starts = [], ends = [];
for (let i = 0; i < section.length; i++) {
  if (section[i] === '"' && (i === 0 || section[i-1] !== '\\')) inStr = !inStr;
  if (inStr) continue;
  if (section[i] === '{') {
    if (depth === 0) starts.push(i);
    depth++;
  } else if (section[i] === '}') {
    depth--;
    if (depth === 0) ends.push(i);
  }
}

// Global positions
const globalArrStart = arrStart;
const globalArrEnd = arrEnd;

// Object 25 is last [FREE], object 26 is first #1 duplicate
console.log('=== GLOBAL POSITIONS ===');
console.log('Array starts at global char:', globalArrStart);
console.log('Array ends at global char:', globalArrEnd);

console.log('\n=== BOUNDARY: Last [FREE] object end -> First #1 object start (global) ===');
let lastFreeGlobalEnd = globalArrStart + ends[25];
let firstDupGlobalStart = globalArrStart + starts[26];
console.log('Last [FREE] ends at:', lastFreeGlobalEnd);
console.log('First #1 starts at:', firstDupGlobalStart);

// Show exact text around boundary
console.log('\n=== TEXT AROUND BOUNDARY ===');
let boundaryText = content.substring(lastFreeGlobalEnd, firstDupGlobalStart + 80);
console.log(boundaryText);

console.log('\n=== LAST 200 CHARS BEFORE ARRAY END ===');
let endText = content.substring(globalArrEnd - 200, globalArrEnd + 5);
console.log(endText);

// Get the exact text from the boundary to array end
console.log('\n=== FULL DUPLICATE SECTION ===');
let dupText = content.substring(firstDupGlobalStart, globalArrEnd + 1);
console.log('Length:', dupText.length);
console.log('First 100:', dupText.substring(0, 100));
console.log('Last 100:', dupText.substring(dupText.length - 100));
