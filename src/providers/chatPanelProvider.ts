import * as vscode from 'vscode';
import { BaseWebviewProvider } from './baseProvider';
import { sessionManager, PromptContent } from '../services/sessionManager';
import { acpManager } from '../acp/manager';
import { logger } from '../utils/logger';
import { skillsService } from '../services/skillsService';
import { mcpService } from '../services/mcpService';
import { agentsService } from '../services/agentsService';
import { hermesDetector } from '../services/hermesDetector';
import { hermesInstaller } from '../services/hermesInstaller';
import { secretsService } from '../services/secretsService';
import { configService } from '../services/configService';
import { CATALOG } from '../services/modelCatalog';
import { permissionStore } from '../services/permissionStore';

export class ChatPanelProvider extends BaseWebviewProvider {
  static readonly viewId = 'hermes-agent.chat';

  focusInput() {
    this.postMessage({ type: 'focus-input' });
  }

  postUpdate(payload: any) {
    logger.debug(`chat postUpdate: ${JSON.stringify(payload).slice(0, 500)}`);
    this.postMessage({ type: 'acp-update', payload });
  }
  postPermissionRequest(payload: any) {
    this.postMessage({ type: 'acp-permission', payload });
  }
  postPermissionResolved(payload: any) {
    this.postMessage({ type: 'acp-permission-resolved', payload });
  }
  postStatus(status: any) {
    this.postMessage({ type: 'acp-status', payload: status });
  }

  private async pushModelStatus() {
    try {
      const m = await hermesInstaller.getCurrentModel();
      this.postMessage({
        type: 'model-status',
        configured: !!(m.provider && m.model),
        provider: m.provider ?? null,
        model: m.model ?? null,
      });
    } catch (e) {
      this.postMessage({
        type: 'model-status',
        configured: false,
        provider: null,
        model: null,
      });
    }
  }

  postToggles() {
    const cfg = vscode.workspace.getConfiguration('hermes-agent');
    this.postMessage({
      type: 'auto-approve',
      enabled: cfg.get<boolean>('autoApprove') ?? false,
    });
    this.postMessage({
      type: 'yolo',
      enabled: cfg.get<boolean>('yolo') ?? false,
    });
  }

  getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = this.cspNonce();
    const version = Date.now();
    const scriptUri = this.getWebviewAssetUri(webview, 'assets', 'main.js') + `?v=${version}`;
    const styleUri = this.getWebviewAssetUri(webview, 'assets', 'main.css') + `?v=${version}`;
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: ${webview.cspSource} vscode-resource: https:; style-src 'self' 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource} 'self'; font-src 'self' data:;" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Hermes Chat</title>
</head>
<body data-view="chat">
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  async handleMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'ready': {
        const s = acpManager.getStatus();
        this.postStatus(s);
        this.postMessage({ type: 'acp-update', payload: { initial: true } });
        await this.pushModelStatus();
        this.postToggles();
        break;
      }
      case 'prompt': {
        const content: PromptContent[] = [];
        if (msg.text) content.push({ type: 'text', text: msg.text });
        for (const img of msg.images ?? []) {
          content.push({ type: 'image', data: img.data, mimeType: img.mimeType });
        }
        for (const res of msg.resources ?? []) {
          content.push({ type: 'resource', resource: { uri: res.uri, mimeType: res.mimeType, text: res.text } });
        }
        try {
          // Auto-create a session on first prompt so users don't get
          // "No active session" when they just open the chat and type.
          if (!sessionManager.getActive()) {
            const info = await sessionManager.create({ mode: msg.mode });
            this.postMessage({ type: 'session-created', sessionId: info.sessionId });
          }
          const result = await sessionManager.sendPrompt(content);
          this.postMessage({ type: 'prompt-finished', stopReason: result.stopReason });
        } catch (e) {
          this.postMessage({ type: 'error', message: (e as Error).message });
        }
        break;
      }
      case 'cancel': {
        await sessionManager.cancel();
        break;
      }
      case 'new-session': {
        const info = await sessionManager.create({ mode: msg.mode });
        this.postMessage({ type: 'session-created', sessionId: info.sessionId });
        break;
      }
      case 'resume-session': {
        await sessionManager.resume(msg.sessionId);
        this.postMessage({ type: 'session-resumed', sessionId: msg.sessionId });
        break;
      }
      case 'set-mode': {
        await sessionManager.setMode(msg.mode);
        break;
      }
      case 'set-title': {
        await sessionManager.setTitle(msg.sessionId, msg.title);
        break;
      }
      case 'load-skills': {
        const det = await hermesDetector.detect();
        if (det.path) {
          const { raw, parsed } = await skillsService.list(det.path);
          this.postMessage({ type: 'skills-list', list: parsed, raw });
        }
        break;
      }
      case 'load-mcp': {
        const det = await hermesDetector.detect();
        if (det.path) {
          const { raw, parsed } = await mcpService.list(det.path);
          this.postMessage({ type: 'mcp-list', list: parsed, raw });
        }
        break;
      }
      case 'toggle-mcp': {
        const det = await hermesDetector.detect();
        if (det.path) {
          if (msg.enabled) await mcpService.enable(det.path, msg.name);
          else await mcpService.disable(det.path, msg.name);
        }
        break;
      }
      case 'load-agents': {
        const agents = await agentsService.list();
        this.postMessage({ type: 'agent-list', agents });
        break;
      }
      case 'switch-agent': {
        this.postMessage({ type: 'agent-switched', agent: msg.agent });
        break;
      }
      case 'get-catalog': {
        // Only send providers that have at least one API key stored (exclude 'custom')
        const configured: typeof CATALOG = [];
        for (const p of CATALOG) {
          if (p.id === 'custom') continue;
          const hasKey = !!(await secretsService.getKey(p.id));
          if (hasKey) configured.push(p);
        }
        this.postMessage({ type: 'catalog', providers: configured });
        break;
      }
      case 'set-model': {
        const det = await hermesDetector.detect();
        if (!det.path) {
          this.postMessage({ type: 'error', message: 'Hermes binary not found. Run the setup wizard.' });
          return;
        }
        const provider = String(msg.provider ?? '').trim();
        let model = String(msg.model ?? '').trim();
        if (model === '__custom__') {
          model = String(msg.customModel ?? '').trim();
        }
        if (!provider && !model) {
          this.postMessage({ type: 'error', message: 'provider and model are required' });
          return;
        }
        try {
          const catalogEntry = CATALOG.find((p) => p.id === provider);
          // Use stored URL > catalog default > undefined
          const baseUrl = configService.getBaseUrl(provider) || catalogEntry?.baseUrl;
          await hermesInstaller.setModel(det.path, provider, model, baseUrl);
          await this.pushModelStatus();
          this.postMessage({ type: 'info', message: `Model set: ${provider} / ${model}` });
        } catch (e) {
          this.postMessage({ type: 'error', message: (e as Error).message });
        }
        break;
      }
      case 'validate-model': {
        const det = await hermesDetector.detect();
        if (det.path) {
          try {
            const m = await hermesInstaller.getCurrentModel();
            const ok = !!(m.provider && m.model);
            this.postMessage({
              type: 'model-validation',
              ok,
              detail: ok ? `${m.provider}/${m.model}` : 'Modelo não configurado',
            });
          } catch (e) {
            this.postMessage({ type: 'model-validation', ok: false, detail: (e as Error).message });
          }
        }
        break;
      }
      case 'open-file': {
        const uri = vscode.Uri.file(msg.path);
        await vscode.window.showTextDocument(uri, { preview: false });
        break;
      }
      case 'clear-permission-cache': {
        permissionStore.clear();
        this.postMessage({ type: 'permission-cache-cleared' });
        break;
      }
      case 'permission-response': {
        // The webview informs that the user clicked an option in the modal.
        // The actual JSON-RPC reply is already in flight — we just need to
        // clear the dialog and trust the host's in-flight request.
        logger.info(`permission response from webview: ${msg.optionId}`);
        break;
      }
      case 'retry-connect': {
        try {
          const detected = await hermesDetector.detect();
          if (!detected.found || !detected.path) {
            this.postMessage({ type: 'error', message: 'Hermes binary not found. Run the setup wizard.' });
            return;
          }
          this.postMessage({ type: 'acp-status', payload: { connected: false, error: 'connecting…' } });
          await acpManager.start(detected);
          this.postMessage({ type: 'acp-status', payload: acpManager.getStatus() });
        } catch (e) {
          this.postMessage({ type: 'error', message: `Connect failed: ${(e as Error).message}` });
        }
        break;
      }
      case 'open-onboarding': {
        await vscode.commands.executeCommand('hermes-agent.installHermes');
        break;
      }
      case 'toggle-auto-approve': {
        const cfg = vscode.workspace.getConfiguration('hermes-agent');
        const cur = cfg.get<boolean>('autoApprove') ?? false;
        await cfg.update('autoApprove', !cur, vscode.ConfigurationTarget.Workspace);
        this.postToggles();
        break;
      }
      case 'open-config-file': {
        const det = await hermesDetector.detect();
        if (det.path) {
          const configPath = require('node:path').join(require('node:os').homedir(), '.hermes', 'config.json');
          const uri = vscode.Uri.file(configPath);
          await vscode.window.showTextDocument(uri, { preview: false });
        }
        break;
      }
      case 'save-config': {
        const det = await hermesDetector.detect();
        if (det.path) {
          const configPath = require('node:path').join(require('node:os').homedir(), '.hermes', 'config.json');
          await require('node:fs/promises').writeFile(configPath, msg.text ?? '', 'utf-8');
          this.postMessage({ type: 'info', message: 'Configuração salva' });
        }
        break;
      }
      case 'get-config': {
        try {
          const configPath = require('node:path').join(require('node:os').homedir(), '.hermes', 'config.json');
          const text = await require('node:fs/promises').readFile(configPath, 'utf-8');
          this.postMessage({ type: 'config-data', text });
        } catch {
          this.postMessage({ type: 'config-data', text: '{}' });
        }
        break;
      }
      case 'save-api-key': {
        const provider = String(msg.provider ?? '').trim();
        const apiKey = String(msg.apiKey ?? '').trim();
        if (!provider || !apiKey) {
          this.postMessage({ type: 'error', message: 'provider and apiKey are required' });
          return;
        }
        await secretsService.setKey(provider, apiKey);
        this.postMessage({ type: 'api-key-saved', provider });
        break;
      }
      case 'get-api-key': {
        const provider = String(msg.provider ?? '').trim();
        if (!provider) {
          this.postMessage({ type: 'error', message: 'provider is required' });
          return;
        }
        const key = await secretsService.getKey(provider);
        // Never send the actual key to webview - just status
        this.postMessage({ type: 'api-key-status', provider, hasKey: !!key });
        break;
      }
      case 'delete-api-key': {
        const provider = String(msg.provider ?? '').trim();
        if (!provider) {
          this.postMessage({ type: 'error', message: 'provider is required' });
          return;
        }
        await secretsService.deleteKey(provider);
        this.postMessage({ type: 'api-key-deleted', provider });
        break;
      }
      case 'list-api-keys': {
        // Check which providers have keys stored
        const providers = CATALOG.map(p => p.id);
        const statuses: Record<string, boolean> = {};
        for (const p of providers) {
          const key = await secretsService.getKey(p);
          statuses[p] = !!key;
        }
        this.postMessage({ type: 'api-keys-list', statuses });
        break;
      }
      case 'save-base-url': {
        const provider = String(msg.provider ?? '').trim();
        const baseUrl = String(msg.baseUrl ?? '').trim();
        if (!provider || !baseUrl) {
          this.postMessage({ type: 'error', message: 'provider and baseUrl are required' });
          return;
        }
        await configService.setBaseUrl(provider, baseUrl);
        this.postMessage({ type: 'base-url-saved', provider });
        break;
      }
      case 'list-base-urls': {
        const allUrls = configService.getAllBaseUrls();
        // Merge with catalog defaults
        const merged: Record<string, string> = {};
        for (const p of CATALOG) {
          merged[p.id] = allUrls[p.id] || p.baseUrl;
        }
        this.postMessage({ type: 'base-urls-list', urls: merged, stored: allUrls });
        break;
      }
      case 'delete-base-url': {
        const provider = String(msg.provider ?? '').trim();
        if (!provider) {
          this.postMessage({ type: 'error', message: 'provider is required' });
          return;
        }
        await configService.deleteBaseUrl(provider);
        this.postMessage({ type: 'base-url-deleted', provider });
        break;
      }
      case 'fetch-provider-models': {
        const provider = String(msg.provider ?? '').trim();
        if (!provider) {
          this.postMessage({ type: 'provider-models', provider: '', models: [], error: 'provider required' });
          return;
        }
        try {
          const apiKey = await secretsService.getKey(provider);
          if (!apiKey) {
            this.postMessage({ type: 'provider-models', provider, models: [], error: 'no API key stored' });
            return;
          }
          const catalogEntry = CATALOG.find((p) => p.id === provider);
          const baseUrl = configService.getBaseUrl(provider) || catalogEntry?.baseUrl;
          if (!baseUrl) {
            this.postMessage({ type: 'provider-models', provider, models: [], error: 'no base URL configured' });
            return;
          }
          const base = baseUrl.replace(/\/+$/, '');
          const headers = { Authorization: `Bearer ${apiKey}` };

          // Try /v1/models first (standard OpenAI-compatible)
          let models: Array<{ id: string; label: string }> = [];
          try {
            const resp = await fetch(`${base}/v1/models`, { headers });
            if (resp.ok) {
              const data = await resp.json() as any;
              models = (data.data ?? []).map((m: any) => ({ id: m.id, label: m.id }));
            }
          } catch { /* ignore */ }

          // If /v1/models failed, try /v1/manifest (NIM-specific)
          if (models.length === 0) {
            try {
              const resp = await fetch(`${base}/v1/manifest`, { headers });
              if (resp.ok) {
                const data = await resp.json() as any;
                const entries = data.models ?? data.artifacts ?? data;
                if (Array.isArray(entries)) {
                  models = entries.map((m: any) => ({
                    id: m.name ?? m.id ?? m.model_name ?? '',
                    label: m.display_name ?? m.name ?? m.id ?? m.model_name ?? '',
                  })).filter((m: { id: string }) => m.id);
                }
              }
            } catch { /* ignore */ }
          }

          // If still empty, try /v1/metadata
          if (models.length === 0) {
            try {
              const resp = await fetch(`${base}/v1/metadata`, { headers });
              if (resp.ok) {
                const data = await resp.json() as any;
                const entries = data.models ?? data.artifacts ?? [];
                if (Array.isArray(entries)) {
                  models = entries.map((m: any) => ({
                    id: m.name ?? m.id ?? m.model_name ?? '',
                    label: m.display_name ?? m.name ?? m.id ?? m.model_name ?? '',
                  })).filter((m: { id: string }) => m.id);
                }
              }
            } catch { /* ignore */ }
          }

          // Probe: for NIM, test each catalog model with a dummy request
          if (models.length === 0 && catalogEntry) {
            const candidates = catalogEntry.models.filter(m => m.id !== '__custom__');
            const available: Array<{ id: string; label: string }> = [];
            await Promise.all(candidates.map(async (m) => {
              try {
                const resp = await fetch(`${base}/v1/chat/completions`, {
                  method: 'POST',
                  headers: { ...headers, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: m.id,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1,
                  }),
                  signal: AbortSignal.timeout(5000),
                });
                if (resp.ok) {
                  available.push({ id: m.id, label: m.label });
                }
              } catch { /* not accessible */ }
            }));
            models = available;
          }

          if (models.length > 0) {
            this.postMessage({ type: 'provider-models', provider, models });
          } else {
            const hint = provider === 'nvidia' ? 'nvidia-permission' : '';
            this.postMessage({ type: 'provider-models', provider, models: [], error: hint });
          }
        } catch (e) {
          this.postMessage({ type: 'provider-models', provider, models: [], error: '' });
        }
        break;
      }
      case 'ping':
        break;
      default:
        logger.warn(`chat: unknown message type ${msg.type}`);
    }
  }
}
