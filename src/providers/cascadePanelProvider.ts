import * as vscode from 'vscode';
import { BaseWebviewProvider } from './baseProvider';
import { acpManager } from '../acp/manager';
import { sessionManager } from '../services/sessionManager';

export class CascadePanelProvider extends BaseWebviewProvider {
  static readonly viewId = 'hermes-agent.cascade';

  postUpdate(payload: any) {
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

  getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = this.getWebviewAssetUri(webview, 'assets', 'main.js');
    const styleUri = this.getWebviewAssetUri(webview, 'assets', 'main.css');
    const nonce = this.cspNonce();
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: ${webview.cspSource} vscode-resource: https:; style-src 'self' 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource} 'self'; font-src 'self' data:;" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Cascade Flow</title>
</head>
<body data-view="cascade">
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  async handleMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'ready': {
        this.postStatus(acpManager.getStatus());
        const active = sessionManager.getActive();
        if (active) this.postMessage({ type: 'session-active', session: active });
        this.postMessage({
          type: 'auto-approve',
          enabled: vscode.workspace.getConfiguration('hermes-agent').get<boolean>('autoApprove') ?? false,
        });
        break;
      }
      case 'new-session':
        await sessionManager.create({ mode: 'code' });
        this.postMessage({ type: 'session-active', session: sessionManager.getActive() });
        break;
      case 'cancel':
        await sessionManager.cancel();
        break;
      case 'open-file': {
        const uri = vscode.Uri.file(msg.path);
        await vscode.window.showTextDocument(uri, { preview: false });
        break;
      }
      case 'open-diff': {
        // open file at line
        const uri = vscode.Uri.file(msg.path);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        if (msg.line) {
          const line = Math.max(0, msg.line - 1);
          editor.selection = new vscode.Selection(line, 0, line, 0);
          editor.revealRange(new vscode.Range(line, 0, line, 0));
        }
        break;
      }
      default:
        // forward to chat provider
        break;
    }
  }
}
