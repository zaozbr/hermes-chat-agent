import * as vscode from 'vscode';
import { Disposable } from 'vscode';

interface TerminalEntry {
  id: string;
  terminal: vscode.Terminal;
  output: string;
  outputBuffer: string[];
  maxLines: number;
  exitCode: number | null;
  done: boolean;
  disposable: Disposable;
  waiters: Array<(code: number | null) => void>;
}

interface CreateTerminalRequestLite {
  command: string;
  cwd?: string;
  env?: Array<{ name: string; value: string }>;
}

class TerminalRegistry {
  private map = new Map<string, TerminalEntry>();

  create(req: CreateTerminalRequestLite): string {
    const id = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let cwd: string | undefined;
    try {
      cwd = req.cwd ?? undefined;
    } catch {
      /* ignore */
    }

    const terminal = vscode.window.createTerminal({
      name: `Hermes: ${req.command.slice(0, 20)}`,
      cwd,
      env: req.env ? Object.fromEntries(req.env.map((e) => [e.name, e.value])) : undefined,
    });

    const entry: TerminalEntry = {
      id,
      terminal,
      output: '',
      outputBuffer: [],
      maxLines: 5000,
      exitCode: null,
      done: false,
      disposable: { dispose: () => {} },
      waiters: [],
    };

    terminal.show(true);
    terminal.sendText(req.command, true);

    const start = Date.now();
    const interval = setInterval(() => {
      if (!this.map.has(id)) {
        clearInterval(interval);
        return;
      }
      const closed = (terminal as unknown as { exited?: boolean }).exited;
      const elapsed = Date.now() - start;
      if (closed) {
        entry.done = true;
        entry.exitCode = 0;
        clearInterval(interval);
        this.resolveWaiters(entry, 0);
      } else if (elapsed > 1000 * 60 * 30) {
        clearInterval(interval);
        this.resolveWaiters(entry, null);
      }
    }, 500);

    entry.disposable = { dispose: () => clearInterval(interval) };

    this.map.set(id, entry);
    return id;
  }

  output(id: string, _timeoutMs?: number) {
    const entry = this.map.get(id);
    if (!entry) {
      return { output: '', truncated: false, exitStatus: null };
    }
    return {
      output: entry.output,
      truncated: entry.outputBuffer.length >= entry.maxLines,
      exitStatus: entry.done ? { exitCode: entry.exitCode } : null,
    };
  }

  async waitForExit(id: string) {
    const entry = this.map.get(id);
    if (!entry) return { exitCode: null };
    if (entry.done) return { exitCode: entry.exitCode };
    return new Promise<{ exitCode: number | null }>((resolve) => {
      entry.waiters.push((code) => resolve({ exitCode: code }));
    });
  }

  release(id: string): void {
    const entry = this.map.get(id);
    if (!entry) return;
    entry.disposable.dispose();
    try {
      entry.terminal.dispose();
    } catch {
      /* ignore */
    }
    this.resolveWaiters(entry, null);
    this.map.delete(id);
  }

  kill(id: string): void {
    const entry = this.map.get(id);
    if (!entry) return;
    try {
      entry.terminal.sendText('\u0003', false);
      setTimeout(() => {
        try {
          entry.terminal.dispose();
        } catch {
          /* ignore */
        }
      }, 1500);
    } catch {
      /* ignore */
    }
    entry.done = true;
    entry.exitCode = 130;
    this.resolveWaiters(entry, 130);
  }

  releaseAll() {
    for (const id of [...this.map.keys()]) {
      this.release(id);
    }
  }

  private resolveWaiters(entry: TerminalEntry, code: number | null) {
    for (const w of entry.waiters) {
      try {
        w(code);
      } catch {
        /* ignore */
      }
    }
    entry.waiters.length = 0;
  }
}

export const terminalRegistry = new TerminalRegistry();
