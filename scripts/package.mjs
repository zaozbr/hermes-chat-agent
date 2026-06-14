import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function packageExtension() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const version = pkg.version;
  const outDir = join(root, 'vscode-hermes-agent-0.1.0.vsix');

  // Clean up previous package if exists
  const fs = await import('node:fs/promises');
  try {
    await fs.rm(outDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  // Build the extension
  console.log('Building extension...');
  execSync('node scripts/build.mjs --mode production', { stdio: 'inherit' });

  // Create the vsix structure
  await fs.mkdir(outDir, { recursive: true });

  // Copy extension files
  await fs.cp(join(root, 'dist'), join(outDir, 'extension'), { recursive: true });
  await fs.cp(join(root, 'webview/src'), join(outDir, 'webview'), { recursive: true });
  await fs.cp(join(root, 'media'), join(outDir, 'media'), { recursive: true });

  // Copy package.json
  await fs.writeFile(join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Create extension.json
  const extensionJson = {
    name: pkg.name,
    displayName: pkg.displayName,
    description: pkg.description,
    version: pkg.version,
    publisher: pkg.publisher,
    engines: pkg.engines,
    categories: pkg.categories,
    contributes: pkg.contributes,
    activationEvents: pkg.activationEvents,
    main: './extension/extension.js',
    repository: pkg.repository,
    bugs: pkg.bugs,
    homepage: pkg.homepage,
    scripts: pkg.scripts,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
  };

  await fs.writeFile(join(outDir, 'extension.json'), JSON.stringify(extensionJson, null, 2));

  // Create README.md
  await fs.writeFile(join(outDir, 'README.md'), '# Hermes Agent\n\nFull Cascade-grade AI coding agent for VS Code, powered by Hermes Agent via the Agent Client Protocol (ACP).');

  // Create LICENSE.md
  await fs.writeFile(join(outDir, 'LICENSE.md'), 'MIT License\n\nCopyright (c) 2026 Hermes Agent');

  console.log(`Extension packaged successfully to ${outDir}`);
}

packageExtension().catch((error) => {
  console.error('Package failed:', error);
  process.exit(1);
});