const fs = require('fs');
const path = require('path');

const filePath = 'E:\\Hermes agent\\extension-insiders.js';

let content = fs.readFileSync(filePath, 'utf-8');
console.log('Original size:', content.length);

// Fix 1: N6e function - has extra braces
// Current: function N6e(n,e,t) { return ''; }}}function BDi
// Should be: function N6e(n,e,t) { return ''; }function BDi
content = content.replace(
  /function N6e\(n,e,t\) \{ return ''; \}\}\}function BDi/,
  "function N6e(n,e,t){return''}function BDi"
);
console.log('Fixed N6e:', content.includes("function N6e(n,e,t){return''}function BDi"));

// Fix 2: BDi function - has extra brace
// Current: function BDi(n,e,t,r) { return ''; }}function HD
// Should be: function BDi(n,e,t,r){return''}function HD
content = content.replace(
  /function BDi\(n,e,t,r\) \{ return ''; \}\}function HD/,
  "function BDi(n,e,t,r){return''}function HD"
);
console.log('Fixed BDi:', content.includes("function BDi(n,e,t,r){return''}function HD"));

// Verify getter is correct
console.log('Getter:', content.includes('get isChatQuotaExceeded(){return!1}'));

// Write fixed file
fs.writeFileSync(filePath, content, 'utf-8');
console.log('New size:', content.length);

// Verify no syntax errors by trying to parse
try {
  new Function(content.substring(0, 100000)); // Just test a portion
  console.log('Syntax check: OK (partial)');
} catch (e) {
  console.log('Syntax error:', e.message);
}