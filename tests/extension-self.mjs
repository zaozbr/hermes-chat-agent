// Extension self-tests via direct module load.
// Mocks the vscode module, then exercises the real service classes.
import { Module } from 'node:module';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { path7za } from 'node:7zip-bin'; // likely missing — will fail

// Use Node's module resolution to inject our vscode mock.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'vscode') return pathToFileURL(path.resolve('tests/_vscode-mock.mjs')).href;
  return origResolve.call(this, request, parent, ...rest);
};

console.log('=== extension self-test ===\n');

// import after monkey-patching
const detector = (await import('../src/services/hermesDetector.js')).hermesDetector;

console.log('-- hermesDetector.detect() --');
const det = await detector.detect();
console.log(JSON.stringify(det, null, 2));
if (!det.found) {
  console.error('FAIL: detector did not find hermes');
  process.exit(1);
}
if (!/^0\.\d+\.\d+/.test(det.version ?? '')) {
  console.error('FAIL: bad version string:', det.version);
  process.exit(1);
}
console.log('OK detector');
