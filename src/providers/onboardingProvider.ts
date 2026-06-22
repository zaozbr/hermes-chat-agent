// TODO: Esconder step "Configure model" (no-op) ou marcar como "via picker"
// TODO: Melhorar UX do picker de modelo
// TODO: Integrar Onboarding como aba no topo (não painel separado)

import * as vscode from 'vscode';
import { BaseWebviewProvider } from './baseProvider';
import { HermesDetection, hermesDetector } from '../services/hermesDetector';
import { hermesInstaller, StepStatus } from '../services/hermesInstaller';
import { processRunner } from '../services/processRunner';
import { acpManager } from '../acp/manager';
import { CATALOG } from '../services/modelCatalog';
import { configService } from '../services/configService';
import { secretsService } from '../services/secretsService';
import { logger } from '../utils/logger';

interface StepRuntime {
  id: string;
  status: StepStatus;
  detail?: string;
  log: string;
  cancel?: () => void;
}

export class OnboardingProvider extends BaseWebviewProvider {
  static readonly viewId = 'hermes-agent.onboarding';
  private detection: HermesDetection | null = null;
  private steps = new Map<string, StepRuntime>();
  private lastError: string | null = null;

  constructor(context: vscode.ExtensionContext, initialDetection: HermesDetection) {
    super(context);
    this.detection = initialDetection;
    for (const s of hermesInstaller.steps()) {
      this.steps.set(s.id, { id: s.id, status: 'pending', log: '' });
    }
  }

  show() {
    if (this.view) this.view.show?.(true);
  }

  getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = this.getWebviewAssetUri(webview, 'assets', 'main.js');
    const styleUri = this.getWebviewAssetUri(webview, 'assets', 'main.css');
    const nonce = this.cspNonce();
    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: ${webview.cspSource} https:; style-src 'self' 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource} 'self'; font-src 'self' data:;" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Install Hermes</title>
</head>
<body data-view="onboarding">
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private snapshotSteps() {
    return Array.from(this.steps.values()).map((s) => ({
      id: s.id,
      label: hermesInstaller.steps().find((d) => d.id === s.id)?.label ?? s.id,
      description: hermesInstaller.steps().find((d) => d.id === s.id)?.description ?? '',
      status: s.status,
      detail: s.detail,
    }));
  }

  private async pushSteps() {
    this.postMessage({ type: 'install-steps', steps: this.snapshotSteps() });
  }

  private async pushLog(id: string, append: string) {
    const s = this.steps.get(id);
    if (!s) return;
    s.log = (s.log + append).slice(-256 * 1024);
    this.postMessage({ type: 'step-log', id, append });
  }

  private async pushModelStatus() {
    if (!this.detection?.path) {
      this.postMessage({ type: 'model-status', configured: false, provider: null, model: null });
      return;
    }
    const m = await hermesInstaller.getCurrentModel();
    this.postMessage({
      type: 'model-status',
      configured: !!(m.provider && m.model),
      provider: m.provider ?? null,
      model: m.model ?? null,
    });
  }

  async handleMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'ready': {
        this.detection = await hermesDetector.detect();
        this.postMessage({ type: 'detection', detection: this.detection });
        await this.pushSteps();
        await this.pushModelStatus();
        this.postMessage({ type: 'catalog', providers: CATALOG });
        break;
      }
      case 're-detect': {
        this.detection = await hermesDetector.detect();
        this.postMessage({ type: 'detection', detection: this.detection });
        await this.pushModelStatus();
        if (this.detection.found) {
          try {
            await acpManager.start(this.detection);
          } catch (e) {
            this.lastError = (e as Error).message;
            this.postMessage({ type: 'error', message: `ACP start failed: ${this.lastError}` });
          }
        }
        break;
      }
      case 'open-install-terminal': {
        hermesInstaller.openTerminalWithInstall();
        break;
      }
      case 'open-config-file': {
        try {
          const envHome = process.env['HERMES_HOME'];
          const localHome: string =
            process.platform === 'win32'
              ? (process.env['LOCALAPPDATA'] ?? '')
              : (process.env['HOME'] ?? '');
          const candidates: string[] = [];
          if (envHome) candidates.push(`${envHome}/config.yaml`);
          if (process.platform === 'win32') {
            candidates.push(
              `${localHome}\\hermes\\config.yaml`,
              `${localHome}\\hermes\\hermes-agent\\config.yaml`,
            );
          } else {
            candidates.push(
              `${localHome}/.config/hermes/config.yaml`,
              `${localHome}/.local/share/hermes/config.yaml`,
              `${localHome}/.local/share/hermes/hermes-agent/config.yaml`,
            );
          }
          let opened = false;
          for (const cfgPath of candidates) {
            try {
              await vscode.window.showTextDocument(vscode.Uri.file(cfgPath), { preview: false });
              opened = true;
              break;
            } catch {
              /* try next */
            }
          }
          if (!opened) {
            this.postMessage({
              type: 'error',
              message: `Could not find config.yaml. Tried:\n  ${candidates.join('\n  ')}`,
            });
          }
        } catch (e) {
          this.postMessage({
            type: 'error',
            message: `Could not open config.yaml: ${(e as Error).message}`,
          });
        }
        break;
      }
      case 'run-install-step': {
        await this.runStep(msg.id);
        break;
      }
      case 'cancel-install-step': {
        const s = this.steps.get(msg.id);
        if (s?.cancel) {
          s.cancel();
          this.postMessage({
            type: 'step-update',
            id: msg.id,
            status: 'failed',
            detail: 'cancelled by user',
          });
        }
        break;
      }
      case 'run-all-install-steps': {
        // Run every step in sequence, skipping already-done ones
        const allSteps = hermesInstaller.steps();
        for (const stepDef of allSteps) {
          const runtime = this.steps.get(stepDef.id);
          if (!runtime || runtime.status === 'done') continue;
          if (stepDef.id === 'setup-model' || stepDef.id === 'check-model') {
            // These steps are driven by the model picker — skip them
            runtime.status = 'skipped';
            runtime.detail = 'Use o seletor de modelo acima';
            await this.pushSteps();
            continue;
          }
          await this.runStep(stepDef.id);
        }
        this.postMessage({
          type: 'info',
          message: 'Auto-setup concluído! Configure o modelo acima.',
        });
        break;
      }
      case 'set-model': {
        if (!this.detection?.path) {
          this.postMessage({
            type: 'error',
            message: 'hermes binary not found. Install it first.',
          });
          return;
        }
        const provider = String(msg.provider ?? '').trim();
        let model = String(msg.model ?? '').trim();
        if (model === '__custom__') {
          model = String(msg.customModel ?? '').trim();
        }
        if (!provider || !model) {
          this.postMessage({ type: 'error', message: 'provider and model are required' });
          return;
        }
        try {
          const catalogEntry = CATALOG.find((p) => p.id === provider);
          const baseUrl = configService.getBaseUrl(provider) || catalogEntry?.baseUrl;
          await hermesInstaller.setModel(this.detection.path, provider, model, baseUrl);
          await this.pushModelStatus();
          // mark setup-model + check-model as done
          const s1 = this.steps.get('setup-model');
          if (s1 && s1.status !== 'done') {
            s1.status = 'done';
            s1.detail = `${provider} / ${model}`;
            await this.pushSteps();
          }
          const s2 = this.steps.get('check-model');
          if (s2) {
            s2.status = 'done';
            s2.detail = `${provider} / ${model}`;
            await this.pushSteps();
          }
          this.postMessage({ type: 'info', message: `Model set: ${provider} / ${model}` });
        } catch (e) {
          this.postMessage({ type: 'error', message: (e as Error).message });
        }
        break;
      }
      case 'get-catalog': {
        const configured: typeof CATALOG = [];
        for (const p of CATALOG) {
          if (p.id === 'custom') continue;
          const hasKey = !!(await secretsService.getKey(p.id));
          if (hasKey) configured.push(p);
        }
        this.postMessage({ type: 'catalog', providers: configured });
        break;
      }
      case 'validate-model': {
        // Quick reachability check: try to GET the provider's model list
        // endpoint if available, otherwise just confirm config looks sane.
        if (!this.detection?.path) {
          this.postMessage({ type: 'model-validation', ok: false, detail: 'hermes not found' });
          return;
        }
        const m = await hermesInstaller.getCurrentModel();
        if (!m.provider || !m.model) {
          this.postMessage({ type: 'model-validation', ok: false, detail: 'model not set' });
          return;
        }
        // Run a 15s probe: hermes status --all (safe, non-interactive)
        const r = await processRunner.run(
          'validate-model',
          this.detection.path,
          ['status', '--all'],
          {
            timeoutMs: 15_000,
          },
        );
        if (r.exitCode === 0) {
          this.postMessage({ type: 'model-validation', ok: true, detail: 'hermes status OK' });
        } else {
          this.postMessage({
            type: 'model-validation',
            ok: false,
            detail: `hermes status exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 200)}`,
          });
        }
        break;
      }
      default:
        logger.debug(`onboarding: unknown message ${msg.type}`);
    }
  }

  private async runStep(id: string) {
    const def = hermesInstaller.steps().find((s) => s.id === id);
    const runtime = this.steps.get(id);
    if (!def || !runtime) return;
    if (runtime.status === 'running' || runtime.status === 'done') return;

    // Pre-flight: needs hermes?
    if (def.needsHermes) {
      if (!this.detection?.found || !this.detection.path) {
        runtime.status = 'failed';
        runtime.detail = 'hermes not installed yet. Run step 1–3 first.';
        this.postMessage({ type: 'step-update', id, status: 'failed', detail: runtime.detail });
        return;
      }
    }

    // Pre-flight: setup-model + check-model are driven by the picker
    if (id === 'setup-model' || id === 'check-model') {
      this.postMessage({
        type: 'info',
        message:
          id === 'setup-model'
            ? 'Use the picker above to set provider + model.'
            : 'Run `Set model` in the picker above to configure.',
      });
      return;
    }

    runtime.status = 'running';
    runtime.detail = undefined;
    runtime.log = '';
    this.postMessage({ type: 'step-update', id, status: 'running' });
    this.postMessage({ type: 'step-log', id, append: '' });

    const hermesPath = this.detection?.path ?? null;
    const pyCmd = process.platform === 'win32' ? 'python' : 'python3';

    try {
      await def.run({
        hermesPath,
        pythonCmd: pyCmd,
        log: (_stream, chunk) => {
          // Throttle log posts: send a small marker with the chunk
          this.pushLog(id, chunk).catch(() => {
            /* ignore */
          });
        },
      });
      runtime.status = 'done';
      runtime.detail = 'ok';
      this.postMessage({ type: 'step-update', id, status: 'done', detail: 'ok' });
    } catch (e) {
      const err = e as Error;
      runtime.status = 'failed';
      runtime.detail = err.message;
      logger.warn(`step ${id} failed: ${err.message}`);
      this.postMessage({ type: 'step-update', id, status: 'failed', detail: err.message });
    } finally {
      runtime.cancel = undefined;
    }
  }
}
