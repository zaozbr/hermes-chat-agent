const fs = require('fs');
const content = fs.readFileSync('C:\\Program Files\\Microsoft VS Code\\6928394f91\\resources\\app\\extensions\\copilot\\dist\\extension.js', 'utf-8');
console.log('File size:', content.length);
console.log('Has P6e:', content.includes('function P6e'));
const patched = content.includes('function P6e(n,e,t){return""}');
console.log('Already patched:', patched);