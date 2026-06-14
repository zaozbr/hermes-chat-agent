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

// Find Synthetic endpoint
let synIdx = c.indexOf('Synthetic');
let modelArrStart = c.indexOf('[', synIdx);
let modelArrEnd = findMatchingBracket(c, modelArrStart, '[', ']');

// Find models already in config (by ID)
let section = c.substring(modelArrStart, modelArrEnd + 1);
let existingIds = section.match(/"id": "([^"]+)"/g).map(m => m.match(/"id": "([^"]+)"/)[1]);

console.log('Existing model IDs:', existingIds);

// Models to add (always_on from Synthetic API that are FREE)
const newModels = [
  {
    id: 'hf:zai-org/GLM-5.1',
    name: '[FREE] GLM-5.1 (Synthetic)',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    capabilities: { toolCalling: false, imageInput: false },
    stream: true
  },
  {
    id: 'hf:zai-org/GLM-4.7-Flash',
    name: '[FREE] GLM-4.7 Flash (Synthetic)',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    capabilities: { toolCalling: false, imageInput: false },
    stream: true
  },
  {
    id: 'hf:moonshotai/Kimi-K2.6',
    name: '[FREE] Kimi K2.6 (Synthetic)',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    capabilities: { toolCalling: true, imageInput: false },
    stream: true
  },
  {
    id: 'hf:Qwen/Qwen3.6-27B',
    name: '[FREE] Qwen3.6 27B (Synthetic)',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    capabilities: { toolCalling: true, imageInput: false },
    stream: true
  },
  {
    id: 'hf:MiniMaxAI/MiniMax-M3',
    name: '[FREE] MiniMax M3 (Synthetic)',
    maxInputTokens: 1048576,
    maxOutputTokens: 1048576,
    capabilities: { toolCalling: true, imageInput: false },
    stream: true
  },
  {
    id: 'hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4',
    name: '[FREE] NVIDIA Nemotron 3 120B (Synthetic)',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    capabilities: { toolCalling: false, imageInput: false },
    stream: true
  }
];

// Filter out duplicates (by id)
const toAdd = newModels.filter(m => !existingIds.includes(m.id) && !existingIds.some(eid => 
  // Also check for similar IDs without hf: prefix
  eid === m.id.replace('hf:', '')
));
console.log(`\nModels to add (${toAdd.length}):`);

if (toAdd.length > 0) {
  // Build insertion text
  let insertText = '';
  for (let i = 0; i < toAdd.length; i++) {
    insertText += ',' + JSON.stringify(toAdd[i], null, 2).split('\n').map(l => '      ' + l).join('\n');
    insertText = insertText.trimEnd();
  }

  // Insert before the closing ]
  const insertPos = modelArrEnd;
  const newContent = c.substring(0, insertPos) + insertText + '\n      ' + c.substring(insertPos);

  console.log('Insert text length:', insertText.length);
  console.log('Insert position:', insertPos);
  console.log('Old file size:', c.length);
  console.log('New file size:', newContent.length);

  fs.writeFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', newContent, 'utf8');
  console.log('\n✅ Synthetic models added successfully!');
} else {
  console.log('No new models to add.');
}

// Verify
const vc = fs.readFileSync('c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json', 'utf8');
let vsynIdx = vc.indexOf('Synthetic');
let varrStart = vc.indexOf('[', vsynIdx);
let varrEnd = findMatchingBracket(vc, varrStart, '[', ']');
let vsection = vc.substring(varrStart, varrEnd + 1);
let vids = vsection.match(/"id": "([^"]+)"/g).map(m => m.match(/"id": "([^"]+)"/)[1]);
console.log('\nTotal models in Synthetic after update:', vids.length);
console.log('All IDs:', vids);
