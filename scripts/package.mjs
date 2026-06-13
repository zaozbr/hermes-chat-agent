#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
process.chdir(root);

function need(cmd, hint) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
  } catch {
    console.error(`Missing dependency: ${cmd}. ${hint}`);
    process.exit(1);
  }
}

need('node', 'Install Node 20+ from https://nodejs.org/');
need('npm', 'Install npm.');
need('vsce', 'npm i -g @vscode/vsce or pnpm i -g @vscode/vsce');

if (!existsSync('dist/extension.js')) {
  console.error('dist/extension.js missing. Run `npm run build` first.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const vsix = `${pkg.name}-${pkg.version}.vsix`;

execSync(`vsce package --no-dependencies --out "${vsix}"`, { stdio: 'inherit' });
console.log(`\n✓ Built ${vsix}`);
console.log(`  Install: code --install-extension ${vsix}`);
