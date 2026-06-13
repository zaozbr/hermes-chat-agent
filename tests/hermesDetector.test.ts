import { describe, it, expect, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// stub the vscode module before importing the service
vi.mock('vscode', () => ({
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
  window: { showInformationMessage: () => undefined },
}));

const exec = promisify(execFile);

describe('hermes CLI smoke', () => {
  it('runs --version', async () => {
    const { stdout } = await exec('hermes', ['--version'], { timeout: 10000 });
    expect(stdout).toContain('Hermes Agent');
  }, 15000);
});
