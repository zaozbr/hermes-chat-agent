import * as vscode from 'vscode';

const STORE_KEY = 'hermes-agent.permission-cache';

interface Cache {
  [toolId: string]: string; // optionId
}

class PermissionStore {
  private cache: Cache = {};
  private context: vscode.ExtensionContext | null = null;

  init(ctx: vscode.ExtensionContext) {
    this.context = ctx;
    this.cache = ctx.workspaceState.get<Cache>(STORE_KEY) ?? {};
  }

  get(toolId: string): string | undefined {
    return this.cache[toolId];
  }

  set(toolId: string, optionId: string) {
    this.cache[toolId] = optionId;
    this.context?.workspaceState.update(STORE_KEY, this.cache);
  }

  clear() {
    this.cache = {};
    this.context?.workspaceState.update(STORE_KEY, this.cache);
  }
}

export const permissionStore = new PermissionStore();
