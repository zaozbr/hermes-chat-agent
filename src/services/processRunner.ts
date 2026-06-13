import { spawn, ChildProcess } from 'node:child_process';
import { logger } from '../utils/logger';

export interface RunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cancelled: boolean;
  durationMs: number;
}

export interface RunOptions {
  /** Hard timeout in ms. 0 disables. */
  timeoutMs?: number;
  /** Working directory. */
  cwd?: string;
  /** Environment merged onto process.env. */
  env?: NodeJS.ProcessEnv;
  /** Receive stdout/stderr chunks live. */
  onLog?: (stream: 'stdout' | 'stderr', chunk: string) => void;
  /** Called when the timeout fires (after kill). */
  onTimeout?: () => void;
  /** Mark a started run so it can be cancelled externally. */
  registerCancel?: (cancel: () => void) => void;
  /** Max bytes to keep buffered for stdout/stderr. Default 256 KB each. */
  maxBufferBytes?: number;
  /** Run on Windows hidden. Default true. */
  windowsHide?: boolean;
}

const KILL_GRACE_MS = 3000;

/**
 * Spawn a child process safely:
 *  - streams stdout/stderr to a callback (no buffer deadlock)
 *  - hard timeout with SIGTERM → SIGKILL escalation
 *  - returns a cancel() function for the caller to abort
 *  - bounded buffers (no OOM on long output)
 *
 * This is the only sanctioned way to run external commands in the
 * extension — direct use of child_process.spawn/exec is banned.
 */
export class ProcessRunner {
  private running = new Map<string, ChildProcess>();

  isRunning(id: string): boolean {
    return this.running.has(id);
  }

  cancel(id: string): boolean {
    const p = this.running.get(id);
    if (!p) return false;
    try {
      p.kill('SIGTERM');
      setTimeout(() => {
        if (this.running.has(id)) {
          try { p.kill('SIGKILL'); } catch { /* ignore */ }
        }
      }, KILL_GRACE_MS);
    } catch {
      /* ignore */
    }
    return true;
  }

  cancelAll(): void {
    for (const id of [...this.running.keys()]) this.cancel(id);
  }

  async run(
    id: string,
    command: string,
    args: string[],
    options: RunOptions = {},
  ): Promise<RunResult> {
    const start = Date.now();
    const maxBuf = options.maxBufferBytes ?? 256 * 1024;
    let stdoutBuf = '';
    let stderrBuf = '';
    let outBytes = 0;
    let errBytes = 0;
    let timedOut = false;
    let cancelled = false;

    if (this.running.has(id)) {
      throw new Error(`process "${id}" is already running`);
    }

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: options.windowsHide ?? true,
      shell: false,
    });
    this.running.set(id, child);

    const onChunk = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
      const s = chunk.toString('utf8');
      if (stream === 'stdout') {
        outBytes += chunk.length;
        if (outBytes < maxBuf) stdoutBuf += s;
      } else {
        errBytes += chunk.length;
        if (errBytes < maxBuf) stderrBuf += s;
      }
      options.onLog?.(stream, s);
    };
    child.stdout?.on('data', onChunk('stdout'));
    child.stderr?.on('data', onChunk('stderr'));

    let timeoutHandle: NodeJS.Timeout | null = null;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        options.onTimeout?.();
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
        // Force-kill after grace period
        setTimeout(() => {
          if (this.running.has(id)) {
            try { child.kill('SIGKILL'); } catch { /* ignore */ }
          }
        }, KILL_GRACE_MS);
      }, options.timeoutMs);
    }

    const cancel = () => {
      cancelled = true;
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      setTimeout(() => {
        if (this.running.has(id)) {
          try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }
      }, KILL_GRACE_MS);
    };
    options.registerCancel?.(cancel);

    const exitCode: number | null = await new Promise((resolveExit) => {
      child.on('exit', (code, signal) => {
        resolveExit(code);
      });
      child.on('error', (err) => {
        logger.error(`process ${id} error: ${err.message}`);
        resolveExit(null);
      });
    });

    if (timeoutHandle) clearTimeout(timeoutHandle);
    this.running.delete(id);

    return {
      exitCode,
      signal: null,
      stdout: stdoutBuf,
      stderr: stderrBuf,
      timedOut,
      cancelled,
      durationMs: Date.now() - start,
    };
  }
}

export const processRunner = new ProcessRunner();
