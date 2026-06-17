import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { ChatPanelProvider } from '../providers/chatPanelProvider';
import { acpManager } from '../acp/manager';
import { sessionManager } from '../services/sessionManager';
import { hermesBridge } from '../services/hermesBridge';
import { hermesDetector } from '../services/hermesDetector';
import { secretsService } from '../services/secretsService';
import { hermesEnvService, HERMES_ENV_MAP } from '../services/hermesEnvService';
import { CATALOG } from '../services/modelCatalog';
import { hermesInstaller } from '../services/hermesInstaller';

export interface CommandDeps {
  chatProvider: ChatPanelProvider;
}

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps) {
  const { chatProvider } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand('hermes-agent.openChat', async () => {
      await vscode.commands.executeCommand('hermes-agent.chat.focus');
      chatProvider.focusInput();
    }),

    vscode.commands.registerCommand('hermes-agent.newSession', async () => {
      try {
        await sessionManager.create();
        chatProvider.postMessage({ type: 'session-created' });
      } catch (e) {
        logger.error('new session failed', e as Error);
        vscode.window.showErrorMessage(`Hermes: ${(e as Error).message}`);
      }
    }),

    vscode.commands.registerCommand('hermes-agent.resumeSession', async () => {
      const picks = (await sessionManager.list()).map((s) => ({
        label: s.title ?? s.sessionId,
        id: s.sessionId,
      }));
      const sel = await vscode.window.showQuickPick(picks, { placeHolder: 'Pick a session' });
      if (!sel) return;
      try {
        await sessionManager.resume(sel.id);
        chatProvider.postMessage({ type: 'session-resumed', sessionId: sel.id });
      } catch (e) {
        vscode.window.showErrorMessage(`Hermes: ${(e as Error).message}`);
      }
    }),

    vscode.commands.registerCommand('hermes-agent.cancelPrompt', async () => {
      await sessionManager.cancel();
      vscode.commands.executeCommand('setContext', 'hermes-agent.promptInProgress', false);
    }),

    vscode.commands.registerCommand('hermes-agent.inlineEdit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const sel = editor.selection;
      const text = editor.document.getText(sel);
      const hint = await vscode.window.showInputBox({
        prompt: 'What should Hermes do with the selected text?',
        placeHolder: 'e.g. refactor to async/await, add JSDoc, fix this bug…',
      });
      if (!hint) return;
      chatProvider.postMessage({
        type: 'inline-edit-request',
        text,
        hint,
        file: editor.document.uri.fsPath,
      });
      await vscode.commands.executeCommand('hermes-agent.openChat');
    }),

    vscode.commands.registerCommand('hermes-agent.pickModel', async () => {
      const detection = await hermesDetector.detect();
      if (!detection.found || !detection.path) {
        vscode.window.showWarningMessage('Hermes not found');
        return;
      }
      try {
        await hermesBridge.pickModel(detection.path);
      } catch (e) {
        vscode.window.showErrorMessage(`Hermes: ${(e as Error).message}`);
      }
    }),

    vscode.commands.registerCommand('hermes-agent.installHermes', async () => {
      await vscode.commands.executeCommand('hermes-agent.chat.focus');
    }),

    vscode.commands.registerCommand('hermes-agent.runDoctor', async () => {
      const detection = await hermesDetector.detect();
      if (!detection.found || !detection.path) {
        vscode.window.showErrorMessage('Hermes not found');
        return;
      }
      const output = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Running hermes doctor…' },
        () => hermesBridge.doctor(detection.path!),
      );
      logger.info(`doctor:\n${output}`);
      const doc = await vscode.workspace.openTextDocument({
        content: output,
        language: 'plaintext',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand('hermes-agent.showStatus', async () => {
      const detection = await hermesDetector.detect();
      if (!detection.found || !detection.path) {
        vscode.window.showErrorMessage('Hermes not found');
        return;
      }
      const output = await hermesBridge.status(detection.path);
      const doc = await vscode.workspace.openTextDocument({
        content: output,
        language: 'plaintext',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand('hermes-agent.openLogs', () => {
      logger.show();
    }),

    vscode.commands.registerCommand('hermes-agent.toggleYolo', async () => {
      const cfg = vscode.workspace.getConfiguration('hermes-agent');
      const cur = cfg.get<boolean>('yolo') ?? false;
      await cfg.update('yolo', !cur, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Hermes: yolo ${!cur ? 'ON' : 'OFF'} (restart session)`);
    }),

    vscode.commands.registerCommand('hermes-agent.toggleAutoApprove', async () => {
      const cfg = vscode.workspace.getConfiguration('hermes-agent');
      const cur = cfg.get<boolean>('autoApprove') ?? false;
      await cfg.update('autoApprove', !cur, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(
        `Hermes: auto-approve ${!cur ? 'ON' : 'OFF'} (host picks allow_always automatically)`,
      );
    }),

    vscode.commands.registerCommand('hermes-agent.installLsp', async () => {
      const detection = await hermesDetector.detect();
      if (!detection.found || !detection.path) {
        vscode.window.showErrorMessage('Hermes not found');
        return;
      }
      const all = await vscode.window.showQuickPick(
        [
          { label: 'List supported language servers', value: false },
          { label: 'Install ALL language servers', value: true },
        ],
        { placeHolder: 'LSP install' },
      );
      if (!all) return;
      const output = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'hermes lsp…' },
        () => hermesBridge.installLsp(detection.path!, all.value),
      );
      vscode.window.showInformationMessage('LSP step done — see Output');
      logger.info(`lsp:\n${output}`);
    }),

    vscode.commands.registerCommand('hermes-agent.installBrowser', async () => {
      const detection = await hermesDetector.detect();
      if (!detection.found || !detection.path) {
        vscode.window.showErrorMessage('Hermes not found');
        return;
      }
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Installing browser (~400MB)…' },
        () => hermesBridge.installBrowser(detection.path!),
      );
      vscode.window.showInformationMessage('Browser tool installed');
    }),

    vscode.commands.registerCommand('hermes-agent.configureApiKey', async () => {
      // 1. Build pick list from catalog + env map
      const items: {
        label: string;
        description: string;
        providerId: string;
        envVar: string;
        alreadySet: boolean;
      }[] = [];

      for (const catalogEntry of CATALOG) {
        const envVar = catalogEntry.envVars[0];
        if (!envVar) continue;
        const has = await hermesEnvService.hasKey(envVar);
        const label = catalogEntry.label;
        const info = HERMES_ENV_MAP[envVar];
        items.push({
          label: has ? `$(pass) ${label}` : `$(key) ${label}`,
          description: has ? '✅ Key configured' : '❌ No key set',
          providerId: catalogEntry.id,
          envVar,
          alreadySet: has,
        });
      }

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a provider to configure its API key',
        matchOnDescription: true,
      });
      if (!pick) return;

      // If already set, ask user what to do
      if (pick.alreadySet) {
        const action = await vscode.window.showWarningMessage(
          `${pick.label.replace(/^\$\(\w+\) /, '')} already has a key configured.`,
          'Replace key',
          'Remove key',
          'Cancel',
        );
        if (action === 'Remove key') {
          await secretsService.deleteKey(pick.providerId);
          vscode.window.showInformationMessage(
            `Key removed for ${pick.label.replace(/^\$\(\w+\) /, '')}`,
          );
          return;
        }
        if (action !== 'Replace key') return;
      }

      // 2. Ask for the API key
      const label = pick.label.replace(/^\$\(\w+\) /, '');
      const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your API key for ${label}`,
        placeHolder: `e.g. sk-... (key for ${pick.envVar})`,
        password: true,
        ignoreFocusOut: true,
        validateInput: (value: string) => {
          if (!value || value.trim().length < 8) return 'API key seems too short';
          return null;
        },
      });
      if (!apiKey) return;

      // 3. Save to SecretStorage
      await secretsService.setKey(pick.providerId, apiKey);

      // 4. Sync to Hermes .env
      await hermesEnvService.setKey(pick.envVar, apiKey);

      // 5. Notify user
      const hasBoth = await hermesEnvService.hasKey(pick.envVar);
      if (hasBoth) {
        vscode.window.showInformationMessage(
          `✅ API key saved for ${label} (SecretStorage + Hermes .env)`,
        );
      } else {
        vscode.window.showWarningMessage(
          `⚠️ Key saved in SecretStorage but could not write to Hermes .env at:\n${hermesEnvService.path}`,
        );
      }
    }),

    vscode.commands.registerCommand('hermes-agent.syncHermesEnv', async () => {
      // Sync all SecretStorage keys to Hermes .env
      const envVars = await secretsService.getEnvVars();
      let count = 0;
      for (const [envVar, apiKey] of Object.entries(envVars)) {
        try {
          await hermesEnvService.setKey(envVar, apiKey);
          count++;
        } catch (e) {
          logger.error(`Failed to sync ${envVar} to Hermes .env`, e as Error);
        }
      }
      if (count > 0) {
        vscode.window.showInformationMessage(`Synced ${count} API key(s) to Hermes .env`);
      } else {
        vscode.window.showInformationMessage('No API keys to sync');
      }
    }),
  );

  acpManager.on('update', (p: { update?: { sessionUpdate?: string } }) => {
    if (
      p?.update?.sessionUpdate === 'tool_call' ||
      p?.update?.sessionUpdate === 'tool_call_update'
    ) {
      vscode.commands.executeCommand('setContext', 'hermes-agent.promptInProgress', true);
    }
  });
  acpManager.on('status', (s: { connected: boolean }) => {
    if (!s.connected)
      vscode.commands.executeCommand('setContext', 'hermes-agent.promptInProgress', false);
  });
}
