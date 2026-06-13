import * as vscode from 'vscode';

class OutputChannelLogger {
  private channel: vscode.LogOutputChannel | null = null;

  init(context: vscode.ExtensionContext) {
    this.channel = vscode.window.createOutputChannel('Hermes Agent', { log: true });
    context.subscriptions.push(this.channel);
  }

  info(msg: string) {
    this.channel?.info(msg);
  }
  warn(msg: string) {
    this.channel?.warn(msg);
  }
  error(msg: string, e?: Error) {
    this.channel?.error(`${msg}${e ? `: ${e.message}\n${e.stack ?? ''}` : ''}`);
  }
  debug(msg: string) {
    this.channel?.info(`[debug] ${msg}`);
  }

  show() {
    this.channel?.show(true);
  }
}

export const logger = new OutputChannelLogger();
