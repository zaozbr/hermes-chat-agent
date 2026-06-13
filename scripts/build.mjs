#!/usr/bin/env node
import { build, context } from 'esbuild';
import { cp, mkdir, rm, watch as fsWatch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'production';
const watch = args.includes('--watch');

const distDir = join(root, 'dist');
const webviewSrc = join(root, 'webview');
const webviewOut = join(root, 'dist-webview');

async function buildExtension() {
  await mkdir(distDir, { recursive: true });
  const cfg = {
    entryPoints: [join(root, 'src/extension.ts')],
    outfile: join(distDir, 'extension.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    minify: false,
    keepNames: true,
    external: [
      'vscode',
      'fsevents',
      '@agentclientprotocol/sdk',
    ],
    mainFields: ['module', 'main'],
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
  if (watch) {
    const ctx = await context(cfg);
    await ctx.watch();
    console.log('[host] watching extension…');
  } else {
    await build(cfg);
    console.log('[host] built extension.js');
  }
}

async function buildWebview() {
  if (existsSync(webviewOut)) {
    await rm(webviewOut, { recursive: true, force: true });
  }
  // delegate to vite via direct node script
  const { spawn } = await import('node:child_process');
  await new Promise((res, rej) => {
    const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
    const child = spawn(process.execPath, [viteBin, 'build', '--config', join(root, 'vite.config.ts'), '--mode', mode, ...(watch ? ['--watch'] : [])], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    if (watch) {
      child.on('spawn', () => res(undefined));
      child.on('error', rej);
    } else {
      child.on('exit', (code) => (code === 0 ? res(undefined) : rej(new Error(`vite exit ${code}`))));
    }
  });
  console.log(`[webview] built to ${webviewOut}`);
}

async function main() {
  await buildExtension();
  if (!watch) {
    await buildWebview();
  } else {
    // in watch mode, kick webview build separately
    buildWebview().catch((e) => console.error(e));
  }
  // Verify both outputs exist
  const fs = await import('node:fs');
  const must = [
    join(distDir, 'extension.js'),
    join(webviewOut, 'index.html'),
    join(webviewOut, 'assets', 'main.js'),
    join(webviewOut, 'assets', 'main.css'),
  ];
  for (const p of must) {
    if (!fs.existsSync(p)) {
      throw new Error(`build artifact missing: ${p}`);
    }
  }
  console.log('[build] all artifacts present:');
  for (const p of must) {
    const st = fs.statSync(p);
    console.log(`  ${p} (${(st.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
