import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { processRunner, RunResult } from './processRunner';
import { logger } from '../utils/logger';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface InstallStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  detail?: string;
  /** Optional log buffer, accumulated by the runner callback. */
  log?: string;
  /** True if this step requires Hermes to be installed. */
  needsHermes?: boolean;
  /**
   * Execute the step. The runner streams stdout/stderr via the onLog
   * callback, which the provider forwards to the webview. Steps must
   * NEVER spawn TUIs that block on stdin — use a non-interactive
   * alternative or surface a "Open terminal" button instead.
   */
  run: (ctx: StepContext) => Promise<void>;
}

export interface StepContext {
  hermesPath: string | null;
  pythonCmd: string | null;
  log: (stream: 'stdout' | 'stderr', chunk: string) => void;
}

class HermesInstaller {
  /**
   * List of safe install steps. Each step is fully cancellable and
   * has a bounded timeout — no step blocks the extension host forever.
   */
  steps(): InstallStep[] {
    return [
      {
        id: 'check-python',
        label: 'Check Python ≥ 3.10',
        description: 'Hermes is a Python package. Verify a usable python3 / python is on PATH.',
        status: 'pending',
        run: async (ctx) => {
          const r = await processRunner.run('check-python', 'python', ['--version'], {
            timeoutMs: 10_000,
            onLog: ctx.log,
          });
          if (r.timedOut) throw new Error('python --version timed out (10s)');
          if (r.exitCode !== 0) {
            // Try py launcher on Windows
            const r2 = await processRunner.run('check-python-py', 'py', ['-3', '--version'], {
              timeoutMs: 10_000,
              onLog: ctx.log,
            });
            if (r2.timedOut) throw new Error('py -3 --version timed out (10s)');
            if (r2.exitCode !== 0) throw new Error('No Python 3.10+ found. Install Python 3.10+ and retry.');
            checkVersion(r2.stdout + r2.stderr);
            return;
          }
          checkVersion(r.stdout + r.stderr);
        },
      },
      {
        id: 'install-hermes',
        label: 'Install hermes-agent (PyPI)',
        description:
          'Tries pipx first, then pip into the active Python (with or without --user depending on venv). Up to 10 min. Skipped if hermes is already importable.',
        status: 'pending',
        run: async (ctx) => {
          // First: is hermes already importable in the active Python?
          // Note: hermes-agent installs as a *namespace* editable install
          // (no top-level `hermes_agent` package), so we probe a known
          // submodule that's always present in the editable finder map.
          const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
          const probe = await processRunner.run(
            'probe-hermes-installed',
            pyCmd,
            ['-c', 'import hermes_bootstrap; print("1")'],
            { timeoutMs: 10_000, onLog: ctx.log },
          );
          if (probe.exitCode === 0 && probe.stdout.trim() === '1') {
            ctx.log('stdout', '\n✓ hermes-agent already importable in active Python — skipping install.\n');
            return;
          }

          // Are we inside a venv? `python -c "import sys; print(sys.prefix != sys.base_prefix)"`
          const venvProbe = await processRunner.run(
            'probe-venv',
            pyCmd,
            ['-c', 'import sys; print("1" if sys.prefix != sys.base_prefix else "0")'],
            { timeoutMs: 10_000, onLog: ctx.log },
          );
          const inVenv = venvProbe.exitCode === 0 && venvProbe.stdout.trim() === '1';

          // Try pipx first (works regardless of venv)
          let pipx: RunResult;
          try {
            pipx = await processRunner.run('check-pipx', 'pipx', ['--version'], {
              timeoutMs: 5_000,
              onLog: ctx.log,
            });
          } catch {
            pipx = { exitCode: 1 } as RunResult;
          }
          if (pipx.exitCode === 0) {
            const r = await processRunner.run(
              'install-hermes',
              'pipx',
              ['install', 'hermes-agent[acp]'],
              { timeoutMs: 600_000, onLog: ctx.log },
            );
            if (r.timedOut) throw new Error('pipx install timed out (10 min) — try the terminal button.');
            if (r.exitCode !== 0) throw new Error(`pipx install failed (exit ${r.exitCode})`);
            return;
          }

          // Fallback: pip. In a venv --user is rejected; outside, --user avoids admin prompts.
          const pipArgs = inVenv
            ? ['-m', 'pip', 'install', 'hermes-agent[acp]']
            : ['-m', 'pip', 'install', '--user', 'hermes-agent[acp]'];
          const why = inVenv ? 'inside a venv' : 'outside a venv';
          ctx.log('stdout', `\n→ using pip (${why}); args: ${pipArgs.join(' ')}\n`);

          const r = await processRunner.run('install-hermes', pyCmd, pipArgs, {
            timeoutMs: 600_000,
            onLog: ctx.log,
          });
          if (r.timedOut) throw new Error('pip install timed out (10 min) — try the terminal button.');
          if (r.exitCode !== 0) {
            const tail = (r.stderr || r.stdout).split(/\r?\n/).slice(-6).join('\n');
            throw new Error(
              `pip install failed (exit ${r.exitCode}).\n` +
                (inVenv
                  ? 'The active Python is a venv. Install the package into this venv or use a separate Python.\n'
                  : 'The active Python is a system Python and the install failed. Try the "Open terminal" button.\n') +
                `Last lines:\n${tail}`,
            );
          }
        },
      },
      {
        id: 'check-hermes',
        label: 'Verify hermes on PATH',
        description: 'hermes --version should report 0.15+.',
        status: 'pending',
        run: async (ctx) => {
          const r = await processRunner.run('check-hermes', 'hermes', ['--version'], {
            timeoutMs: 10_000,
            onLog: ctx.log,
          });
          if (r.timedOut) throw new Error('hermes --version timed out (10s)');
          if (r.exitCode !== 0) {
            throw new Error('hermes --version failed. Open a terminal and run `hermes --version` to diagnose.');
          }
        },
      },
      {
        id: 'setup-model',
        label: 'Configure model provider + model',
        description:
          'Pick a provider (e.g. NVIDIA NIM) and a model. We write the choice to config.yaml via `hermes config set` — no interactive TUI is launched from the extension host.',
        status: 'pending',
        run: async (_ctx) => {
          // No-op. The actual configuration is driven from the webview:
          // the user picks a provider/model in the Setup wizard, the
          // webview posts { type: 'set-model', provider, model }, and
          // the host calls `hermes config set` for both keys. We mark
          // this step done as soon as the picker reports success.
        },
      },
      {
        id: 'check-model',
        label: 'Verify model is configured',
        description: 'Read config.yaml and confirm `model.model` is non-empty.',
        status: 'pending',
        needsHermes: true,
        run: async (ctx) => {
          if (!ctx.hermesPath) throw new Error('hermes binary not found');
          const cfg = await readHermesConfig();
          if (!cfg.model) throw new Error('No `model:` block in config.yaml');
          if (!cfg.model.provider) throw new Error('`model.provider` is not set in config.yaml');
          if (!cfg.model.model) {
            throw new Error('`model.model` is not set in config.yaml. Use the picker above.');
          }
        },
      },
      {
        id: 'postinstall',
        label: 'Bootstrap runtime (node, ripgrep, ffmpeg)',
        description: 'hermes postinstall. Long: up to 10 min. Streams output to the log below.',
        status: 'pending',
        needsHermes: true,
        run: async (ctx) => {
          if (!ctx.hermesPath) throw new Error('hermes binary not found');
          const r = await processRunner.run('postinstall', ctx.hermesPath, ['postinstall'], {
            timeoutMs: 600_000,
            onLog: ctx.log,
          });
          if (r.timedOut) throw new Error('hermes postinstall timed out (10 min). Run `hermes postinstall` in a terminal.');
          if (r.exitCode !== 0) throw new Error(`hermes postinstall failed (exit ${r.exitCode})`);
        },
      },
      {
        id: 'setup-browser',
        label: 'Install browser tool (optional, ~400MB)',
        description: 'hermes acp --setup-browser --yes. Skip if you don\'t need browser automation.',
        status: 'pending',
        needsHermes: true,
        run: async (ctx) => {
          if (!ctx.hermesPath) throw new Error('hermes binary not found');
          const r = await processRunner.run(
            'setup-browser',
            ctx.hermesPath,
            ['acp', '--setup-browser', '--yes'],
            { timeoutMs: 600_000, onLog: ctx.log },
          );
          if (r.timedOut) throw new Error('browser install timed out (10 min). Run `hermes acp --setup-browser --yes` in a terminal.');
          if (r.exitCode !== 0) throw new Error(`browser install failed (exit ${r.exitCode})`);
        },
      },
    ];
  }

  /**
   * Open a real terminal with the install command ready to run.
   * The user can copy the command, run it manually, and the wizard
   * will pick up the result on next re-detect.
   *
   * If the active Python is a venv (detected by VIRTUAL_ENV or by
   * sys.prefix != sys.base_prefix), we drop --user.
   */
  openTerminalWithInstall() {
    const isWin = process.platform === 'win32';
    const inVenv = !!process.env.VIRTUAL_ENV;
    const pipLine = inVenv
      ? 'pip install hermes-agent[acp]'
      : isWin
      ? 'pip install --user hermes-agent[acp]'
      : 'pipx install hermes-agent[acp]';
    const installCmd = `${pipLine} && hermes postinstall`;
    const term = vscode.window.createTerminal({ name: 'Hermes Install' });
    term.show(true);
    term.sendText(installCmd, true);
  }

  /**
   * Set the model in config.yaml. We use `hermes config set` (the
   * blessed write path) instead of editing YAML directly, so the file
   * is re-serialized by Hermes and stays consistent with the schema.
   */
  async setModel(hermesPath: string, provider: string, model: string, baseUrl?: string): Promise<void> {
    if (!provider) throw new Error('provider is required');
    if (!model) throw new Error('model id is required');
    const r1 = await processRunner.run('config-set-provider', hermesPath, [
      'config', 'set', 'model.provider', provider,
    ], { timeoutMs: 15_000 });
    if (r1.exitCode !== 0) {
      throw new Error(`hermes config set model.provider failed: ${r1.stderr || r1.stdout}`);
    }
    const r2 = await processRunner.run('config-set-model', hermesPath, [
      'config', 'set', 'model.default', model,
    ], { timeoutMs: 15_000 });
    if (r2.exitCode !== 0) {
      throw new Error(`hermes config set model.default failed: ${r2.stderr || r2.stdout}`);
    }
    if (baseUrl) {
      const r3 = await processRunner.run('config-set-base-url', hermesPath, [
        'config', 'set', 'model.base_url', baseUrl,
      ], { timeoutMs: 15_000 });
      if (r3.exitCode !== 0) {
        throw new Error(`hermes config set model.base_url failed: ${r3.stderr || r3.stdout}`);
      }
    }
    logger.info(`model configured: ${provider} / ${model} (base_url=${baseUrl ?? 'unchanged'})`);
  }

  /** Read the current model config from config.yaml directly. */
  async getCurrentModel(): Promise<{ provider?: string; model?: string }> {
    return await readModelFromConfig();
  }
}

function checkVersion(out: string) {
  const m = out.match(/Python (\d+)\.(\d+)/);
  if (!m) throw new Error(`Could not parse Python version from: ${out.trim()}`);
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  if (major < 3 || (major === 3 && minor < 10)) {
    throw new Error(`Python ${major}.${minor} found, but 3.10+ is required.`);
  }
}

interface HermesConfig {
  model?: {
    provider?: string;
    default?: string;
    base_url?: string;
    api_mode?: string;
  };
}

async function findHermesConfigPath(): Promise<string> {
  // Hermes home can be at $HERMES_HOME or in a few well-known locations.
  // We probe a generous list so we find config.yaml on Windows / macOS / Linux
  // for both pip-style and venv-style installs.
  const envHome = process.env.HERMES_HOME;
  let localHome: string;
  if (process.platform === 'win32') {
    localHome = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
  } else {
    localHome = process.env.HOME ?? os.homedir();
  }
  const candidates: string[] = [];
  if (envHome) candidates.push(path.join(envHome, 'config.yaml'));
  if (process.platform === 'win32') {
    candidates.push(
      path.join(localHome, 'hermes', 'config.yaml'),
      path.join(localHome, 'hermes', 'hermes-agent', 'config.yaml'),
    );
  } else {
    candidates.push(
      path.join(localHome, '.config', 'hermes', 'config.yaml'),
      path.join(localHome, '.local', 'share', 'hermes', 'config.yaml'),
      path.join(localHome, '.local', 'share', 'hermes', 'hermes-agent', 'config.yaml'),
    );
  }
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch { /* not here */ }
  }
  throw new Error(`hermes config.yaml not found. Tried:\n  ${candidates.join('\n  ')}`);
}

async function readHermesConfig(): Promise<HermesConfig> {
  const p = await findHermesConfigPath();
  const text = await fs.readFile(p, 'utf8');
  return (yaml.load(text) as HermesConfig) ?? {};
}

async function readModelFromConfig(): Promise<{ provider?: string; model?: string }> {
  try {
    const cfg = await readHermesConfig();
    return { provider: cfg.model?.provider, model: cfg.model?.default };
  } catch (e) {
    logger.debug(`readModelFromConfig: ${(e as Error).message}`);
    return {};
  }
}

export const hermesInstaller = new HermesInstaller();
