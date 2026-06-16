const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Usuario\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\fd0fbb3f5b\\resources\\app\\extensions\\copilot\\dist\\extension.js', 'utf-8');

console.log('File size:', content.length);
console.log('N6e fixed:', content.includes("function N6e(n,e,t){return''}function BDi"));
console.log('BDi fixed:', content.includes("function BDi(n,e,t,r){return''}function HD"));
console.log('Getter:', content.includes('get isChatQuotaExceeded(){return false;}'));

// Check for the syntax error pattern
console.log('Has triple brace:', content.includes('}}}function'));
console.log('Has double brace after BDi:', content.includes('}}function HD'));