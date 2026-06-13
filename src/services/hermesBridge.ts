import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger';

const exec = promisify(execFile);

/**
 * Bridges to `hermes` CLI subcommands that aren't exposed via ACP.
 * The webview sends these messages and gets back JSON.
 */
class HermesBridge {
  async status(hermesPath: string): Promise<string> {
    const { stdout } = await exec(hermesPath, ['status', '--all'], { timeout: 15000 });
    return stdout;
  }
  async doctor(hermesPath: string, fix = false): Promise<string> {
    const { stdout } = await exec(hermesPath, ['doctor', ...(fix ? ['--fix'] : [])], { timeout: 60000 });
    return stdout;
  }
  async pickModel(hermesPath: string): Promise<void> {
    // opens an interactive picker in the host terminal — usually we don't want this
    // from a webview. Instead we run a non-interactive model list and show it.
    const { stdout } = await exec(hermesPath, ['fallback', 'list'], { timeout: 10000 });
    logger.info(`fallback list: ${stdout}`);
  }
  async installLsp(hermesPath: string, all = false): Promise<string> {
    const { stdout } = await exec(hermesPath, ['lsp', all ? 'install-all' : 'list'], { timeout: 300000 });
    return stdout;
  }
  async installBrowser(hermesPath: string, yes = true): Promise<string> {
    const { stdout } = await exec(
      hermesPath,
      ['acp', '--setup-browser', ...(yes ? ['--yes'] : [])],
      { timeout: 600000 },
    );
    return stdout;
  }
  async update(hermesPath: string, checkOnly = true): Promise<string> {
    const { stdout } = await exec(hermesPath, ['update', ...(checkOnly ? ['--check'] : [])], { timeout: 30000 });
    return stdout;
  }
  async sessions(hermesPath: string, op: 'list' | 'export' | 'browse' = 'list'): Promise<string> {
    const { stdout } = await exec(hermesPath, ['sessions', op], { timeout: 10000 });
    return stdout;
  }
}

export const hermesBridge = new HermesBridge();
