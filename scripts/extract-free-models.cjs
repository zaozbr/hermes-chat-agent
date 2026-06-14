// Extract FREE model configurations from VS Code settings.json
const fs = require('fs');

const SETTINGS_PATH = 'c:/Users/Usuario/AppData/Roaming/Code - Insiders/User/settings.json';

function findEndpointsArray(text) {
  const key = '"unifyChatProvider.endpoints"';
  const startIdx = text.indexOf(key);
  if (startIdx === -1) return null;

  const colonIdx = text.indexOf(':', startIdx + key.length);
  if (colonIdx === -1) return null;

  const arrayStart = text.indexOf('[', colonIdx);
  if (arrayStart === -1) return null;

  // Bracket-depth parsing
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = arrayStart; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.substring(arrayStart, i + 1));
      }
    }
  }
  return null;
}

function main() {
  console.log('=== Extracting FREE Model Configurations ===\n');

  const settings = fs.readFileSync(SETTINGS_PATH, 'utf8');
  const endpoints = findEndpointsArray(settings);

  if (!endpoints) {
    console.error('ERROR: Could not parse endpoints array');
    process.exit(1);
  }

  console.log('Found ' + endpoints.length + ' endpoints:\n');

  for (const ep of endpoints) {
    const freeModels = (ep.models || []).filter((m) => m.name && m.name.includes('[FREE]'));

    console.log('===========================');
    console.log('  Name: ' + ep.name);
    console.log('  URL: ' + ep.baseUrl);
    console.log('  Type: ' + ep.type);
    console.log('  FREE models: ' + freeModels.length);
    console.log('===========================');

    if (freeModels.length > 0) {
      freeModels.forEach((m) => {
        console.log('  [' + m.id + '] ' + m.name);
      });
    }
    console.log();
  }

  // Check for API keys in flat format
  console.log('\n=== Looking for API Keys ===');

  // Try to find apiKeys
  const keyMatch = settings.match(/"unifyChatProvider\.apiKeys"\s*:\s*(\{[\s\S]*?\})\s*[,}]/);
  if (keyMatch) {
    try {
      const keys = JSON.parse(keyMatch[1]);
      console.log('Found apiKeys:', Object.keys(keys).join(', '));
    } catch (e) {
      console.log('Found apiKeys but could not parse');
      console.log(keyMatch[1].substring(0, 200));
    }
  } else {
    console.log('No flat apiKeys found');
  }

  // Check each endpoint for auth config
  for (const ep of endpoints) {
    if (ep.auth) {
      console.log('\n' + ep.name + ' has auth: ' + JSON.stringify(ep.auth).substring(0, 100));
    }
  }

  console.log('\n=== DONE ===');
}

main();
