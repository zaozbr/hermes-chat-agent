const fs = require('fs');

const filePath = 'c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json';
let content = fs.readFileSync(filePath, 'utf8');

// ============================================================
// PHASE 1: Remove #1 duplicates from OpenRouter
// ============================================================
function findMatchingBracket(str, start, openB, closeB) {
  let d = 1, i = start + 1;
  while (i < str.length && d > 0) {
    if (str[i] === openB) d++;
    else if (str[i] === closeB) d--;
    i++;
  }
  return d === 0 ? i - 1 : -1;
}

// Find OpenRouter section
let orIdx = content.indexOf('OpenRouter');
let orArrStart = content.indexOf('[', orIdx);
let orArrEnd = findMatchingBracket(content, orArrStart, '[', ']');
let orSection = content.substring(orArrStart, orArrEnd + 1);

// Find all top-level objects in the array
let depth = 0, inStr = false, starts = [], ends = [];
for (let i = 0; i < orSection.length; i++) {
  if (orSection[i] === '"' && (i === 0 || orSection[i-1] !== '\\')) inStr = !inStr;
  if (inStr) continue;
  if (orSection[i] === '{') {
    if (depth === 0) starts.push(i);
    depth++;
  } else if (orSection[i] === '}') {
    depth--;
    if (depth === 0) ends.push(i);
  }
}

console.log('OpenRouter total objects:', starts.length);

// Check which are [FREE] and which are #1 duplicates
let freeCount = 0, dupCount = 0;
let lastFreeIndex = -1;
for (let i = 0; i < starts.length; i++) {
  let objText = orSection.substring(starts[i], ends[i] + 1);
  let nameMatch = objText.match(/"name": "([^"]+)"/);
  let name = nameMatch ? nameMatch[1] : '';
  let idMatch = objText.match(/"id": "([^"]+)"/);
  let id = idMatch ? idMatch[1] : '';
  
  if (id.endsWith('#1')) {
    dupCount++;
    console.log(`  #1 duplicate [${i}]: ${id.substring(0,50)} -> ${name.substring(0,50)}`);
  } else if (name.startsWith('[FREE]')) {
    freeCount++;
    lastFreeIndex = i;
    console.log(`  ✅ [FREE] [${i}]: ${id.substring(0,50)}`);
  } else {
    console.log(`  ❓ unknown [${i}]: ${id.substring(0,50)} -> ${name.substring(0,50)}`);
  }
}

console.log(`\nSummary: ${freeCount} [FREE] models, ${dupCount} #1 duplicates`);

if (lastFreeIndex >= 0) {
  // Find the corresponding positions in the original content
  let globalFreeEnd = orArrStart + ends[lastFreeIndex]; // end of last [FREE] model
  let globalDupStart = orArrStart + starts[lastFreeIndex + 1]; // start of first #1 model
  let globalArrClose = orArrEnd;
  
  // Text from comma after last [FREE] through the ] to remove
  // We need to find the exact comma after the last [FREE] closing }
  let textToRemove = content.substring(globalFreeEnd, globalArrClose + 1);
  // textToRemove starts with "}" but we need to remove the "," after it too
  // Find the comma
  let commaPos = globalFreeEnd + 1; // skip the }
  // Actually the text is "},\n        {" so we need to include from the comma
  
  // oldString: from `,` after last [FREE] model to the `]` of array
  // We'll keep only the closing `]`
  let replacement = '\n      ]';
  
  // Get exact old string
  let oldStr = content.substring(globalFreeEnd + 1, globalArrClose + 1); // from `,` to `]`
  
  // Find the exact boundary marker - the comma + newline before first #1
  // This starts right after the closing } of the last [FREE] model
  let afterLastFree = content.substring(globalFreeEnd, globalFreeEnd + 20);
  console.log('\nContext after last [FREE]:', JSON.stringify(afterLastFree));
  
  // The replace string starts from the comma after last [FREE] model
  let removeFrom = globalFreeEnd; // The "}" of last free model
  let removeTo = globalArrClose; // The "]" of array close
  
  // Get the text that includes the comma
  // after `}` -> `,`
  let marker = content.substring(globalFreeEnd, globalFreeEnd + 2);
  console.log('Marker after last free:', JSON.stringify(marker));
  
  // The old string starts from the `}` of last free model through to the `]`
  // But we want to keep the `}` and `]` and just remove everything in between
  // Actually let's do it differently:
  // Replace `",\n        { ...all duplicates... }\n      ]` with `"\n      ]`
  // The last [FREE] model ends with `}` 
  // Then there's `,` + newline + spaces + `{` (first #1)
  // We remove from that comma to the end of the array
  
  // Let me find the exact comma after last free's closing brace
  // The text looks like: ...stream": true\n        }\n      ]
  // But before the `]`, there are also #1 objects
  // The exact boundary after last free:
  // `}\n        ,\n        {` or `},\n        {`
  
  // Simplified: I'll replace the entire block from comma after last free through the array
  // with just whitespace and ]
  
  // Find the comma after the last free model's closing }
  let afterBrace = content.substring(globalFreeEnd, globalFreeEnd + 50);
  console.log('After last free (50 chars):', JSON.stringify(afterBrace));
  
  // The exact old string to replace - from the comma after last [FREE] 
  // to the closing ] (inclusive)
  // We want to keep the } and the ]
  let oldEndText = content.substring(globalFreeEnd, globalArrClose + 1);
  
  // Remove: from the comma (after last [FREE] }) through the last #1's } and the , and whitespace before ]
  // Keep: \n      ]
  
  // Find where the comma is
  let commaIdx = -1;
  for (let i = 1; i < 10; i++) {
    if (content[globalFreeEnd + i] === ',') {
      commaIdx = globalFreeEnd + i;
      break;
    }
  }
  
  if (commaIdx > 0) {
    // Replace from comma to the ] (inclusive)
    let fullRemove = content.substring(commaIdx, globalArrClose + 1);
    console.log('\nRemoving ' + fullRemove.length + ' chars (from comma after last [FREE] to array close)');
    
    let newContent = content.substring(0, commaIdx) + '\n      ' + content.substring(globalArrClose, globalArrClose + 1);
    // Actually, let me keep the proper formatting
    // The last [FREE] ends with }, so after removing the comma and #1 models, 
    // we need } and then the closing ]
    
    // What we want:
    // ...last [FREE]...\n        }\n      ]
    
    newContent = content.substring(0, globalFreeEnd + 1) + '\n      ]' + content.substring(globalArrClose + 1);
    
    // Write back
    let originalLen = content.length;
    content = newContent;
    console.log('File size: ' + originalLen + ' -> ' + content.length + ' (removed ' + (originalLen - content.length) + ' chars)');
    
    // Verify
    let newOrIdx = content.indexOf('OpenRouter');
    let newOrArrStart = content.indexOf('[', newOrIdx);
    let newOrArrEndOld = findMatchingBracket(content, newOrArrStart, '[', ']');
    let newOrSection = content.substring(newOrArrStart, newOrArrEndOld + 1);
    
    // Count objects in new section
    depth = 0; inStr = false; starts = []; ends = [];
    for (let i = 0; i < newOrSection.length; i++) {
      if (newOrSection[i] === '"' && (i === 0 || newOrSection[i-1] !== '\\')) inStr = !inStr;
      if (inStr) continue;
      if (newOrSection[i] === '{') {
        if (depth === 0) starts.push(i);
        depth++;
      } else if (newOrSection[i] === '}') {
        depth--;
        if (depth === 0) ends.push(i);
      }
    }
    console.log('New OpenRouter model count:', starts.length);
    
    // Check no #1 models remain
    let hasDupes = false;
    for (let i = 0; i < starts.length; i++) {
      let objText = newOrSection.substring(starts[i], ends[i] + 1);
      let idMatch = objText.match(/"id": "([^"]+)"/);
      let id = idMatch ? idMatch[1] : '';
      if (id.endsWith('#1')) {
        console.log('  ⚠️  Still has #1:', id);
        hasDupes = true;
      }
    }
    if (!hasDupes) console.log('✅ No #1 duplicates remaining');
    
    // Write the file
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('\n✅ settings.json updated successfully!');
  } else {
    console.log('❌ Could not find comma after last [FREE] model');
  }
} else {
  console.log('❌ No [FREE] models found');
}
