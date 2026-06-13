import * as vscode from 'vscode';
import * as path from 'node:path';
import { logger } from '../utils/logger';

export abstract class BaseWebviewProvider implements vscode.WebviewViewProvider {
  protected view: vscode.WebviewView | null = null;
  protected disposables: vscode.Disposable[] = [];

  constructor(protected context: vscode.ExtensionContext) {}

  // subclass overrides
  abstract getHtmlForWebview(webview: vscode.Webview): string;
  abstract handleMessage(message: any): Promise<void> | void;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'dist-webview')),
        vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
      ],
    };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (e) {
        logger.error(`webview message error: ${(e as Error).message}`, e as Error);
        this.postMessage({ type: 'error', message: (e as Error).message });
      }
    }, null, this.disposables);

    webviewView.onDidDispose(() => {
      this.view = null;
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];
    }, null, this.disposables);
  }

  postMessage(msg: any) {
    this.view?.webview.postMessage(msg);
  }

  protected cspNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  protected getWebviewAssetUri(webview: vscode.Webview, ...parts: string[]): vscode.Uri {
    const onDiskPath = path.join(this.context.extensionPath, 'dist-webview', ...parts);
    return webview.asWebviewUri(vscode.Uri.file(onDiskPath));
  }

  protected getMediaUri(webview: vscode.Webview, name: string): vscode.Uri {
    const onDisk = path.join(this.context.extensionPath, 'media', name);
    return webview.asWebviewUri(vscode.Uri.file(onDisk));
  }
}
