import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as vscode from 'vscode';

export interface WorkspaceContext {
  cwd: string;
  agentsMd: string | null;
  soulMd: string | null;
  cursorRules: string | null;
  mcpServers: Array<{ name: string; command: string; args: string[]; env?: { name: string; value: string }[] }>;
}

class WorkspaceContextService {
  collect(): WorkspaceContext {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const cfg = vscode.workspace.getConfiguration('hermes-agent');
    const explicitCwd = cfg.get<string>('cwd');

    const cwd = explicitCwd || folders[0]?.uri.fsPath || os.homedir();

    return {
      cwd,
      agentsMd: this.tryRead(path.join(cwd, 'AGENTS.md')),
      soulMd: this.tryRead(path.join(cwd, 'SOUL.md')),
      cursorRules: this.tryRead(path.join(cwd, '.cursorrules')),
      mcpServers: (cfg.get<unknown>('mcpServers') as WorkspaceContext['mcpServers']) ?? [],
    };
  }

  private tryRead(p: string): string | null {
    if (!fs.existsSync(p)) return null;
    try {
      return fs.readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  }
}

export const workspaceContext = new WorkspaceContextService();
