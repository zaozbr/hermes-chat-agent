import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

const exec = promisify(execFile);

export interface HermesDetection {
  found: boolean;
  path?: string;
  version?: string;
  source?: 'PATH' | 'venv' | 'config' | 'manual';
  acpOk?: boolean;
}

const KNOWN_WINDOWS_PATHS = [
  path.join(os.homedir(), 'AppData', 'Local', 'hermes', 'hermes-agent', 'venv', 'Scripts', 'hermes.exe'),
  path.join(os.homedir(), 'AppData', 'Local', 'hermes', 'hermes-agent', 'venv', 'Scripts', 'hermes-acp.exe'),
  path.join(os.homedir(), 'hermes', 'venv', 'Scripts', 'hermes.exe'),
];

const KNOWN_POSIX_PATHS = [
  path.join(os.homedir(), '.local', 'share', 'hermes', 'hermes-agent', 'venv', 'bin', 'hermes'),
  path.join(os.homedir(), '.local', 'share', 'hermes-agent', 'venv', 'bin', 'hermes'),
  path.join(os.homedir(), 'hermes-agent', '.venv', 'bin', 'hermes'),
  '/usr/local/bin/hermes',
  '/opt/hermes-agent/venv/bin/hermes',
];

export class HermesDetector {
  async detect(): Promise<HermesDetection> {
    // 1. manual config override
    const cfg = this.readConfigPath();
    if (cfg) {
      const r = await this.tryAt(cfg);
      if (r.found) return r;
    }

    // 2. PATH
    const inPath = await this.tryOnPath();
    if (inPath.found) return { ...inPath, source: 'PATH' };

    // 3. known locations
    const candidates = process.platform === 'win32' ? KNOWN_WINDOWS_PATHS : KNOWN_POSIX_PATHS;
    for (const c of candidates) {
      if (existsSync(c)) {
        const r = await this.tryAt(c);
        if (r.found) return { ...r, source: 'venv' };
      }
    }

    return { found: false };
  }

  private readConfigPath(): string | undefined {
    const cfg = vscode.workspace.getConfiguration('hermes-agent').get<string>('path');
    if (cfg && cfg !== 'hermes') return cfg;
    return undefined;
  }

  private async tryOnPath(): Promise<HermesDetection> {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    try {
      const { stdout } = await exec(cmd, ['hermes']);
      const first = stdout.split(/\r?\n/).find((l) => l.trim());
      if (first) {
        return await this.tryAt(first.trim());
      }
    } catch {
      // not on PATH
    }
    return { found: false };
  }

  private async tryAt(p: string): Promise<HermesDetection> {
    try {
      const stat = await fs.stat(p);
      if (!stat.isFile()) return { found: false };
    } catch {
      return { found: false };
    }
    try {
      const { stdout } = await exec(p, ['version'], { timeout: 5000 });
      const v = this.parseVersion(stdout);
      return { found: true, path: p, version: v };
    } catch (e) {
      logger.debug(`tryAt ${p} failed: ${(e as Error).message}`);
      return { found: false };
    }
  }

  private parseVersion(s: string): string | undefined {
    const m = s.match(/v?(\d+\.\d+\.\d+(?:\.\w+)?)/);
    return m?.[1];
  }
}

export const hermesDetector = new HermesDetector();
