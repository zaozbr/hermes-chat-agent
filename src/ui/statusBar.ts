import * as vscode from 'vscode';
import { acpManager } from '../acp/manager';

class StatusBar {
  private item: vscode.StatusBarItem | null = null;

  init(_context: vscode.ExtensionContext) {
    if (!vscode.workspace.getConfiguration('hermes-agent.statusBar').get('enabled', true)) {
      return;
    }
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'hermes-agent.openChat';
    this.item.text = '$(loading~spin) Hermes';
    this.item.tooltip = 'Hermes Agent for VS Code';
    this.item.show();
    this.refresh();
  }

  setStatus(s: { connected: boolean; agent?: string; agentVersion?: string; error?: string; usage?: { used: number; size: number }; provider?: string; model?: string }) {
    if (!this.item) return;
    if (!s.connected) {
      this.item.text = `$(error) Hermes: ${s.error ?? 'disconnected'}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.item.tooltip = 'Click to open Hermes chat';
      return;
    }
    const usage = s.usage
      ? ` · ${(s.usage.used / 1000).toFixed(1)}k/${(s.usage.size / 1000).toFixed(0)}k`
      : '';
    const model = s.model ? ` · ${s.model}` : '';
    this.item.text = `$(zap) Hermes ${s.agentVersion ? `v${s.agentVersion}` : ''}${model}${usage}`;
    this.item.backgroundColor = s.model ? undefined : new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.tooltip = `${s.agent ?? 'Hermes Agent'}${s.model ? ` · ${s.model}` : ' · no model configured'} — click to open chat`;
  }

  setDisconnected(reason: string) {
    this.setStatus({ connected: false, error: reason });
  }

  refresh() {
    this.setStatus(acpManager.getStatus());
  }

  dispose() {
    this.item?.dispose();
    this.item = null;
  }
}

export const statusBar = new StatusBar();
