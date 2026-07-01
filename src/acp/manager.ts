import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import * as vscode from 'vscode';
import { Readable, Writable } from 'node:stream';
import { logger } from '../utils/logger';
import { HermesDetection } from '../services/hermesDetector';
import { terminalRegistry } from './terminals';
import { approvalService } from '../services/approvalService';
import { permissionStore } from '../services/permissionStore';
import { hermesInstaller } from '../services/hermesInstaller';
import { secretsService } from '../services/secretsService';

// Loaded dynamically because the SDK is ESM-only.
// We type as `any` here to avoid TS CJS/ESM interop friction; the runtime
// types are validated by the SDK itself.
type SdkModule = any;
type SdkClient = any;
type SdkConnection = any;

export interface AcpStatus {
  connected: boolean;
  agent?: string;
  agentVersion?: string;
  protocolVersion?: number;
  error?: string;
  cwd?: string;
  model?: string;
  provider?: string;
  usage?: { used: number; size: number; cost?: { amount: number; currency: string } };
}

class AcpManager extends EventEmitter {
  private proc: ChildProcess | null = null;
  private conn: SdkConnection | null = null;
  private currentSessionId: string | null = null;
  private status: AcpStatus = { connected: false };
  private sdk: SdkModule | null = null;

  getStatus(): AcpStatus {
    return this.status;
  }

  async start(detection: HermesDetection): Promise<void> {
    if (this.proc) {
      logger.warn('ACP already started');
      return;
    }
    if (!detection.found || !detection.path) {
      throw new Error('hermes executable not found');
    }

    // Load SDK (ESM-only) via dynamic import from extension's node_modules
    // to avoid esbuild bundling TDZ issues with ESM-only packages.
    // In esbuild CJS output, use require() for Node built-ins to avoid TDZ.
    if (!this.sdk) {
      const vscode = require('vscode');
      const path = require('node:path');
      const ext = vscode.extensions.getExtension('hermes-agent.vscode-hermes-agent');
      if (!ext) {
        throw new Error('Extension hermes-agent.vscode-hermes-agent not found');
      }
      const extPath = ext.extensionPath;
      const module = require('node:module');
      const createRequire = module.createRequire;
      const requireFn = createRequire(path.join(extPath, 'package.json'));
      const sdkPath = requireFn.resolve('@agentclientprotocol/sdk');
      // On Windows, dynamic import() requires file:// URL for absolute paths
      const sdkUrl =
        process.platform === 'win32'
          ? 'file:///' + sdkPath.replace(/\\/g, '/')
          : 'file://' + sdkPath;
      this.sdk = await import(sdkUrl);
    }

    const cfg = vscode.workspace.getConfiguration('hermes-agent');
    const userArgs = cfg.get<string[]>('args') ?? ['acp', '--accept-hooks'];
    const userEnv = cfg.get<Record<string, string>>('env') ?? {};
    const yolo = cfg.get<boolean>('yolo') ?? false;

    // Split global flags (before the subcommand) from subcommand flags.
    // `hermes --yolo acp --accept-hooks` is the correct shape.
    // Hermes 0.15.1 global flags: --version, -z PROMPT, -m MODEL, --provider,
    // -t TOOLSETS, --resume, --continue, --worktree, --accept-hooks,
    // --skills, --yolo, --pass-session-id, --ignore-user-config,
    // --ignore-rules, --tui, --cli, --dev
    // NOTE: --max-turns / --checkpoints are NOT hermes flags in 0.15.1 —
    // do NOT auto-inject them or hermes errors with "invalid choice: '90'".
    const subIdx = userArgs.findIndex((a) => a === 'acp' || a === 'chat' || a === 'tui');
    const subName = subIdx >= 0 ? userArgs[subIdx] : 'acp';
    const subArgs = subIdx >= 0 ? userArgs.slice(subIdx + 1) : [];
    const userGlobal = subIdx >= 0 ? userArgs.slice(0, subIdx) : [];

    const global: string[] = [...userGlobal];
    if (yolo && !global.includes('--yolo')) global.push('--yolo');

    const args = [...global, subName, ...subArgs];

    // Inject stored API keys from secret storage
    const storedKeys = await secretsService.getEnvVars();

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...storedKeys,
      ...userEnv,
      HERMES_ACCEPT_HOOKS: userEnv['HERMES_ACCEPT_HOOKS'] ?? '1',
      TERM: 'xterm-256color',
    };

    logger.info(`spawning ${detection.path} ${args.join(' ')}`);
    logger.info(
      `env HERMES_MODEL=${env['HERMES_MODEL'] ?? '(unset)'} HERMES_PROVIDER=${env['HERMES_PROVIDER'] ?? '(unset)'}`,
    );

    this.proc = spawn(detection.path, args.filter(Boolean) as string[], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'] as const,
      windowsHide: true,
    });

    this.proc!.stderr?.on('data', (d: Buffer) => {
      const s = d.toString();
      // log at info (not debug) when the agent says something is wrong
      const lvl = /error|exception|traceback|failed|unrecognized/i.test(s) ? 'error' : 'debug';
      if (lvl === 'error') logger.error(`[hermes stderr] ${s.trim()}`);
      else logger.debug(`[hermes stderr] ${s}`);
    });
    this.proc!.on('exit', (code, signal) => {
      const msg = `hermes exited (code=${code}${signal ? `, signal=${signal}` : ''})`;
      logger.warn(msg);
      this.proc = null;
      this.conn = null;
      this.setStatus({ connected: false, error: msg });
    });
    this.proc!.on('error', (e) => {
      logger.error('hermes spawn error', e);
      this.setStatus({ connected: false, error: `spawn error: ${e.message}` });
    });

    // Convert Node streams to Web streams (Node 18+).
    const input = Readable.toWeb(
      this.proc!.stdout as Readable,
    ) as unknown as ReadableStream<Uint8Array>;
    const output = Writable.toWeb(
      this.proc!.stdin as Writable,
    ) as unknown as WritableStream<Uint8Array>;
    const stream = this.sdk.ndJsonStream(output, input);

    const client = this.createClient(this.sdk);
    this.conn = new this.sdk.ClientSideConnection(client, stream);

    try {
      const init = await this.conn.initialize({
        protocolVersion: 1,
        clientCapabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: true,
        },
        clientInfo: {
          name: 'vscode-hermes-agent',
          title: 'Hermes Agent for VS Code',
          version: '0.1.0',
        },
      });

      // Read model from config so the status bar / chat can show it.
      let modelInfo: { provider?: string; model?: string } = {};
      try {
        modelInfo = await hermesInstaller.getCurrentModel();
      } catch (e) {
        logger.warn(`getCurrentModel failed: ${(e as Error).message}`);
      }
      if (!modelInfo.model) {
        logger.warn('No model configured. Open the Setup view to pick a provider + model.');
      }

      this.setStatus({
        connected: true,
        agent: init.agentInfo?.name ?? 'hermes-agent',
        agentVersion: init.agentInfo?.version ?? detection.version,
        protocolVersion: init.protocolVersion,
        provider: modelInfo.provider,
        model: modelInfo.model,
      });
      logger.info(
        `ACP initialized: ${init.agentInfo?.name}@${init.agentInfo?.version} (proto ${init.protocolVersion}) — model ${modelInfo.provider ?? '?'}/${modelInfo.model ?? '?'}`,
      );
    } catch (e) {
      logger.error('ACP initialize failed', e as Error);
      this.stop();
      throw e;
    }
  }

  stop(): void {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch {
        /* ignore */
      }
      this.proc = null;
    }
    this.conn = null;
    this.setStatus({ connected: false });
    terminalRegistry.releaseAll();
  }

  /**
   * Restart the ACP process. Safely stops any running instance and
   * starts a fresh one. This is called after model configuration so
   * the agent picks up the new provider / model / base URL.
   */
  async restart(detection: HermesDetection): Promise<void> {
    this.stop();
    await this.start(detection);
  }

  get connection(): any {
    return this.conn;
  }

  setCurrentSession(id: string | null) {
    this.currentSessionId = id;
  }
  getCurrentSession(): string | null {
    return this.currentSessionId;
  }

  private setStatus(s: Partial<AcpStatus>) {
    this.status = { ...this.status, ...s };
    this.emit('status', this.status);
  }

  setUsage(usage: AcpStatus['usage']) {
    this.status.usage = usage;
    this.emit('status', this.status);
  }

  // ---- Client interface implementation ----

  private createClient(_sdk: SdkModule): (agent: any) => SdkClient {
    return (_agent: any): SdkClient => {
      // capture `this` via a stable reference
      const emit = (name: string, payload: any) => this.emit(name, payload);
      return {
        async requestPermission(params: any) {
          const id = `${params.sessionId}:${params.toolCall.toolCallId}`;

          // 1. Cache hit — instant, no UI
          const cached = permissionStore.get(id);
          if (cached) {
            return { outcome: { outcome: 'selected', optionId: cached } };
          }

          // 2. Host-side auto-approve (independent from hermes --yolo).
          //    When on, pick the safest allow option automatically:
          //    prefer "allow_always" (so next call is also instant),
          //    fall back to "allow_once", else reject.
          const cfg = vscode.workspace.getConfiguration('hermes-agent');
          const autoApprove = cfg.get<boolean>('autoApprove') ?? false;
          if (autoApprove) {
            const opt =
              params.options.find((o: any) => o.kind === 'allow_always') ??
              params.options.find((o: any) => o.kind === 'allow_once');
            if (opt) {
              if (opt.kind === 'allow_always') permissionStore.set(id, opt.optionId);
              logger.info(
                `auto-approve: ${opt.kind} for ${params.toolCall?.title ?? params.toolCall?.toolCallId} (optionId=${opt.optionId})`,
              );
              return { outcome: { outcome: 'selected', optionId: opt.optionId } };
            }
            // No allow option at all — auto-reject to be safe.
            const reject = params.options.find((o: any) => o.kind === 'reject_once');
            if (reject) return { outcome: { outcome: 'selected', optionId: reject.optionId } };
          }

          // 3. Show the QuickPick. We also emit 'permission' so the
          //    webview can display its modal; once the user picks (or
          //    auto-approve kicks in elsewhere) we emit 'permission-resolved'
          //    so the webview clears its modal.
          emit('permission', params);
          const result = await approvalService.request(params);
          const r: any = result;
          if (
            r.outcome?.outcome === 'selected' &&
            params.options.find((o: any) => o.optionId === r.outcome.optionId)?.kind ===
              'allow_always'
          ) {
            permissionStore.set(id, r.outcome.optionId);
          }
          // Tell the webview to close its modal — the user responded.
          emit('permission-resolved', {
            sessionId: params.sessionId,
            toolCallId: params.toolCall?.toolCallId,
            optionId: r.outcome?.optionId ?? null,
            outcome: r.outcome?.outcome ?? 'cancelled',
          });
          return result;
        },

        async sessionUpdate(params: any) {
          logger.debug(`sessionUpdate received: ${JSON.stringify(params).slice(0, 500)}`);
          emit('update', params);
        },

        async readTextFile(params: any) {
          const uri = vscode.Uri.file(params.path);
          const data = await vscode.workspace.fs.readFile(uri);
          let text = new TextDecoder().decode(data);
          if (params.limit != null && params.line != null) {
            const lines = text.split(/\r?\n/);
            const start = Math.max(0, params.line);
            text = lines.slice(start, start + (params.limit ?? 0)).join('\n');
          }
          return { content: text };
        },

        async writeTextFile(params: any) {
          const uri = vscode.Uri.file(params.path);
          const data = new TextEncoder().encode(params.content);
          await vscode.workspace.fs.writeFile(uri, data);
          try {
            await vscode.window.showTextDocument(uri, { preview: true, preserveFocus: true });
          } catch {
            /* ignore */
          }
          return {};
        },

        async createTerminal(params: any) {
          const id = terminalRegistry.create(params);
          return { terminalId: id };
        },

        async terminalOutput(params: any) {
          return terminalRegistry.output(params.terminalId, undefined);
        },

        async waitForTerminalExit(params: any) {
          return terminalRegistry.waitForExit(params.terminalId);
        },

        async releaseTerminal({ terminalId }: { terminalId: string }) {
          terminalRegistry.release(terminalId);
        },

        async killTerminal({ terminalId }: { terminalId: string }) {
          terminalRegistry.kill(terminalId);
        },
      };
    };
  }
}

export const acpManager = new AcpManager();
