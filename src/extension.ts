import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { ChatPanelProvider } from './providers/chatPanelProvider';
import { statusBar } from './ui/statusBar';
import { logger } from './utils/logger';
import { acpManager } from './acp/manager';
import { hermesDetector } from './services/hermesDetector';
import { secretsService } from './services/secretsService';
import { configService } from './services/configService';
import { hermesEnvService } from './services/hermesEnvService';

let chatProvider: ChatPanelProvider;

export async function activate(context: vscode.ExtensionContext) {
  logger.init(context);
  logger.info('Hermes Agent for VS Code activating…');

  statusBar.init(context);
  secretsService.init(context);
  configService.init(context);

  const detected = await hermesDetector.detect();
  if (!detected.found) {
    logger.warn('hermes not found in PATH or in known locations');
    statusBar.setDisconnected('Hermes not installed');
  } else {
    logger.info(`hermes found at ${detected.path} (${detected.version ?? 'unknown'})`);
  }

  chatProvider = new ChatPanelProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewId, chatProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  acpManager.on('update', (payload) => {
    chatProvider.postUpdate(payload);
  });
  acpManager.on('permission', (payload) => {
    chatProvider.postPermissionRequest(payload);
  });
  acpManager.on('permission-resolved', (payload) => {
    chatProvider.postPermissionResolved(payload);
  });
  acpManager.on('status', (s) => {
    statusBar.setStatus(s);
    chatProvider.postStatus(s);
  });

  registerCommands(context, { chatProvider });

  if (detected.found) {
    try {
      await acpManager.start(detected);
    } catch (e) {
      const err = e as Error;
      logger.error('failed to start ACP', err);
      statusBar.setDisconnected('ACP start failed');
      chatProvider.postMessage({
        type: 'error',
        message: `Could not start Hermes ACP: ${err.message}. Try \`hermes acp --check\`.`,
      });
    }
  } else {
    chatProvider.postMessage({
      type: 'error',
      message: `Hermes not found. Install it or set \`hermes-agent.path\` in settings.`,
    });
  }

  // Auto-check: if OpenCode Zen key is missing, prompt user to configure it
  if (!(await hermesEnvService.hasKey('OPENCODE_ZEN_API_KEY'))) {
    // Small delay so the UI settles first
    setTimeout(async () => {
      const action = await vscode.window.showInformationMessage(
        'Hermes: OpenCode Zen API key not configured. Configure it now for free model access?',
        'Configure API Key',
        'Not now',
      );
      if (action === 'Configure API Key') {
        await vscode.commands.executeCommand('hermes-agent.configureApiKey');
      }
    }, 1500);
  }

  logger.info('Hermes Agent for VS Code activated');
}

export function deactivate() {
  logger.info('Hermes Agent deactivating');
  acpManager.stop();
  statusBar.dispose();
}
