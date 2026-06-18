// TODO: ChatView - lista contígua de mensagens (não bolhas separadas)
// TODO: Thought process com cores sutis (opacity reduzida)
// TODO: Input com botão anexar (📎) + @file mention support
// TODO: Diff inline preview antes de aplicar
// TODO: Aba Setup/Cascade no topo (single webview com tabs)
// TODO: Aba Configurações MCP (listar, toggle, configurar)
// TODO: Aba Configurações/Tweaks (performance, toolsets, cache)
// TODO: MCP integration profunda no painel principal

import { useSyncExternalStore } from 'react';
import { vscode } from '../utils/vscode';

export interface Message {
  id: string;
  kind: 'user' | 'agent' | 'thought' | 'tool' | 'system';
  text: string;
  timestamp: number;
  toolCallId?: string;
  toolTitle?: string;
  toolKind?: ToolKind;
  toolStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolLocations?: Array<{ path: string; line?: number }>;
  toolDiff?: { path: string; oldText?: string; newText: string };
  toolOutput?: string;
}

export type ToolKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'think'
  | 'fetch'
  | 'other';

export interface PlanEntry {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface SkillInfo {
  name: string;
  description: string;
  source: 'local' | 'hub' | 'bundled';
  installed: boolean;
}
export interface McpInfo {
  name: string;
  transport: string;
  enabled: boolean;
}

export interface McpServerDetail {
  name: string;
  tools: Array<{ name: string; description: string }>;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  error?: string;
}

export interface McpInstallForm {
  open: boolean;
  type: 'registry' | 'custom';
  customName?: string;
  customCommand?: string;
  customArgs?: string;
  customUrl?: string;
}

export interface CatalogProvider {
  id: string;
  label: string;
  envVars: string[];
  baseUrl: string;
  models: Array<{ id: string; label: string; ctx?: string; free: boolean; notes?: string }>;
}

export interface AgentProfile {
  name: string;
  description: string;
  mode: string;
  color?: string;
}

export interface State {
  status: {
    connected: boolean;
    agent?: string;
    agentVersion?: string;
    error?: string;
    provider?: string;
    model?: string;
    usage?: { used: number; size: number; cost?: { amount: number; currency: string } };
  };
  messages: Message[];
  plan: PlanEntry[];
  availableCommands: Array<{ name: string; description: string; inputHint?: string }>;
  skills: SkillInfo[];
  mcp: McpInfo[];
  mcpDetail: Record<string, McpServerDetail>;
  mcpError: string | null;
  installForm: McpInstallForm;
  mode: 'code' | 'chat';
  sessionId: string | null;
  inProgress: boolean;
  permissionRequest: null | {
    toolCallId: string;
    title: string;
    options: Array<{ optionId: string; name: string; kind: string }>;
  };
  inlineEditRequest: null | { text: string; hint: string; file: string };
  error: string | null;
  info: string | null;
  detection: { found: boolean; path?: string; version?: string } | null;
  installSteps: Array<{
    id: string;
    label: string;
    description: string;
    status: string;
    detail?: string;
  }>;
  stepLogs: Record<string, string>;
  catalog: CatalogProvider[];
  providerModels: Record<string, Array<{ id: string; label: string }>>;
  providerModelsError: Record<string, string>;
  modelStatus: { configured: boolean; provider: string | null; model: string | null };
  modelValidation: { ok: boolean; detail: string } | null;
  previousModel: { provider: string | null; model: string | null } | null;
  autoApprove: boolean;
  yolo: boolean;
  lastAgentMessageId: string | null;
  lastThoughtMessageId: string | null;
  agents: AgentProfile[];
  currentAgent: string;
}

const initial: State = {
  status: { connected: false },
  messages: [],
  plan: [],
  availableCommands: [],
  skills: [],
  mcp: [],
  mcpDetail: {},
  mcpError: null,
  installForm: { open: false, type: 'registry' },
  mode: 'code',
  sessionId: null,
  inProgress: false,
  permissionRequest: null,
  inlineEditRequest: null,
  error: null,
  info: null,
  detection: null,
  installSteps: [],
  stepLogs: {},
  catalog: [],
  providerModels: {},
  providerModelsError: {},
  modelStatus: { configured: false, provider: null, model: null },
  modelValidation: null,
  previousModel: null,
  autoApprove: true,
  yolo: false,
  lastAgentMessageId: null,
  lastThoughtMessageId: null,
  agents: [
    {
      name: 'build',
      description: 'Agente principal para código e alterações',
      mode: 'primary',
      color: '#4caf50',
    },
    { name: 'plan', description: 'Planejamento e análise', mode: 'primary', color: '#2196f3' },
    { name: 'general', description: 'Conversas gerais', mode: 'primary', color: '#9c27b0' },
    { name: 'explore', description: 'Exploração de código', mode: 'primary', color: '#ff9800' },
  ],
  currentAgent: 'build',
};

class Store {
  private state: State = initial;
  private listeners = new Set<() => void>();

  get = (): State => this.state;
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  private set(updater: (s: State) => State) {
    this.state = updater(this.state);
    this.listeners.forEach((l) => l());
  }

  applyMessage(msg: any) {
    switch (msg.type) {
      case 'focus-input':
        requestAnimationFrame(() => {
          document.querySelector<HTMLTextAreaElement>('textarea.input')?.focus();
        });
        break;
      case 'acp-status':
        this.set((s) => ({ ...s, status: msg.payload }));
        break;
      case 'acp-update':
        this.handleUpdate(msg.payload);
        break;
      case 'acp-permission':
        this.set((s) => ({
          ...s,
          permissionRequest: {
            toolCallId: msg.payload.toolCall?.toolCallId ?? '',
            title: msg.payload.toolCall?.title ?? 'Permission',
            options: msg.payload.options ?? [],
          },
        }));
        break;
      case 'acp-permission-resolved':
        this.set((s) => ({ ...s, permissionRequest: null }));
        break;
      case 'inline-edit-request':
        this.set((s) => ({
          ...s,
          inlineEditRequest: { text: msg.text ?? '', hint: msg.hint ?? '', file: msg.file ?? '' },
        }));
        break;
      case 'prompt-finished':
        this.set((s) => ({ ...s, inProgress: false }));
        break;
      case 'session-created':
        this.set((s) => ({
          ...s,
          sessionId: msg.sessionId ?? null,
          messages: [],
          plan: [],
          lastAgentMessageId: null,
        }));
        break;
      case 'session-resumed':
        this.set((s) => ({
          ...s,
          sessionId: msg.sessionId,
          messages: [],
          plan: [],
          lastAgentMessageId: null,
        }));
        break;
      case 'session-active':
        this.set((s) => ({ ...s, sessionId: msg.session?.sessionId ?? null }));
        break;
      case 'skills-list':
        this.set((s) => ({ ...s, skills: msg.list ?? [] }));
        break;
      case 'mcp-list':
        this.set((s) => ({ ...s, mcp: msg.list ?? [], mcpError: null }));
        break;
      case 'mcp-installed':
        // Refresh list after install
        this.set((s) => ({ ...s, installForm: { open: false, type: 'registry' } }));
        // Request a fresh list from extension
        setTimeout(() => store.loadMcp(), 500);
        break;
      case 'mcp-removed':
        // Refresh list after removal
        setTimeout(() => store.loadMcp(), 500);
        break;
      case 'mcp-tools':
        if (msg.serverName) {
          this.set((s) => ({
            ...s,
            mcpDetail: {
              ...s.mcpDetail,
              [msg.serverName]: msg.detail as McpServerDetail,
            },
          }));
        }
        break;
      case 'mcp-error':
        this.set((s) => ({ ...s, mcpError: msg.message ?? null }));
        break;
      case 'error':
        this.set((s) => ({ ...s, error: msg.message, inProgress: false }));
        break;
      case 'detection':
        this.set((s) => ({ ...s, detection: msg.detection }));
        break;
      case 'install-steps':
        this.set((s) => ({ ...s, installSteps: msg.steps ?? [] }));
        break;
      case 'step-update':
        this.set((s) => ({
          ...s,
          installSteps: s.installSteps.map((st) =>
            st.id === msg.id ? { ...st, status: msg.status, detail: msg.detail } : st,
          ),
        }));
        break;
      case 'step-log':
        this.set((s) => {
          const prev = s.stepLogs[msg.id] ?? '';
          const next = (prev + (msg.append ?? '')).slice(-256 * 1024);
          return { ...s, stepLogs: { ...s.stepLogs, [msg.id]: next } };
        });
        break;
      case 'catalog':
        this.set((s) => ({ ...s, catalog: msg.providers ?? [] }));
        break;
      case 'provider-models':
        this.set((s) => {
          const providerModels = { ...s.providerModels };
          const providerModelsError = { ...s.providerModelsError };
          if (msg.error) {
            providerModelsError[msg.provider] = msg.error;
            providerModels[msg.provider] = [];
          } else {
            delete providerModelsError[msg.provider];
            providerModels[msg.provider] = msg.models ?? [];
          }
          return { ...s, providerModels, providerModelsError };
        });
        break;
      case 'model-status': {
        const newProvider = msg.provider ?? null;
        const newModel = msg.model ?? null;
        this.set((s) => {
          const prevConfigured = s.modelStatus.configured;
          const switched =
            prevConfigured &&
            (s.modelStatus.provider !== newProvider || s.modelStatus.model !== newModel);
          return {
            ...s,
            modelStatus: {
              configured: !!msg.configured,
              provider: newProvider,
              model: newModel,
            },
            // Also update status so header badge reflects the new model
            status: {
              ...s.status,
              provider: newProvider ?? s.status.provider,
              model: newModel ?? s.status.model,
            },
            previousModel: switched
              ? { provider: s.modelStatus.provider, model: s.modelStatus.model }
              : s.previousModel,
          };
        });
        break;
      }
      case 'model-validation': {
        const ok = !!msg.ok;
        this.set((s) => ({
          ...s,
          modelValidation: { ok, detail: msg.detail ?? '' },
          // If validation fails and we have a previous model, show revert option
          error:
            !ok && s.previousModel
              ? `Modelo inválido: ${msg.detail ?? 'desconhecido'}. Volte ao modelo anterior.`
              : s.error,
        }));
        break;
      }
      case 'agent-list':
        this.set((s) => ({ ...s, agents: msg.agents ?? s.agents }));
        break;
      case 'agent-switched':
        this.set((s) => ({ ...s, currentAgent: msg.agent ?? s.currentAgent }));
        break;
      case 'info':
        this.set((s) => ({ ...s, info: msg.message ?? null }));
        break;
      case 'auto-approve':
        this.set((s) => ({ ...s, autoApprove: !!msg.enabled }));
        break;
      case 'yolo':
        this.set((s) => ({ ...s, yolo: !!msg.enabled }));
        break;
    }
  }

  private handleUpdate(payload: any) {
    if (!payload) return;
    if (payload.initial) return;
    const u = payload.update;
    if (!u) return;
    const sid = payload.sessionId;
    switch (u.sessionUpdate) {
      case 'user_message_chunk':
        this.set((s) => ({
          ...s,
          inProgress: true,
          messages: [...s.messages, this.mkMessage('user', sid, u)],
        }));
        break;
      case 'agent_message_chunk':
        this.appendToMessage(sid, 'agent', u);
        break;
      case 'agent_thought_chunk':
        this.appendToMessage(sid, 'thought', u);
        break;
      case 'tool_call':
        this.set((s) => ({
          ...s,
          messages: [...s.messages, this.mkToolMessage(sid, u, u.status ?? 'pending')],
        }));
        break;
      case 'tool_call_update':
        this.updateToolMessage(sid, u);
        break;
      case 'plan':
        this.set((s) => ({ ...s, plan: u.entries ?? [] }));
        break;
      case 'available_commands_update':
        this.set((s) => ({ ...s, availableCommands: u.commands ?? [] }));
        break;
      case 'usage_update':
        this.set((s) => ({
          ...s,
          status: { ...s.status, usage: { used: u.used, size: u.size, cost: u.cost } },
        }));
        break;
      case 'current_mode_update':
        this.set((s) => ({ ...s, mode: u.modeId }));
        break;
    }
  }

  private mkMessage(kind: 'user' | 'agent' | 'thought' | 'system', sid: string, u: any): Message {
    const id =
      u.messageId ?? `${sid}:${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      kind,
      text: this.extractText(u.content),
      timestamp: Date.now(),
    };
  }

  private mkToolMessage(
    sid: string,
    u: any,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ): Message {
    const id = u.toolCallId ?? `${sid}:tool:${Date.now()}`;
    return {
      id,
      kind: 'tool',
      text: '',
      timestamp: Date.now(),
      toolCallId: id,
      toolTitle: u.title ?? 'Tool call',
      toolKind: u.kind ?? 'other',
      toolStatus: status,
      toolLocations: u.locations ?? [],
      toolDiff: this.extractDiff(u.content),
      toolOutput: this.extractOutput(u.content),
    };
  }

  private extractText(c: any): string {
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (c.type === 'text') return c.text ?? '';
    return '';
  }
  private extractOutput(content: any[]): string {
    if (!Array.isArray(content)) return '';
    return content
      .map((c) => {
        if (c.type === 'content' && c.content?.type === 'text') return c.content.text;
        if (c.type === 'content' && c.content?.text) return c.content.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  private extractDiff(
    content: any[],
  ): { path: string; oldText?: string; newText: string } | undefined {
    if (!Array.isArray(content)) return undefined;
    const d = content.find((c) => c.type === 'diff');
    if (!d) return undefined;
    return { path: d.path, oldText: d.oldText, newText: d.newText };
  }

  private appendToMessage(sid: string, kind: 'agent' | 'thought', u: any) {
    const text = this.extractText(u.content);
    if (!text) return;
    const id = u.messageId;
    this.set((s) => {
      // Try to find by messageId first
      if (id && s.messages.find((m) => m.id === id)) {
        return {
          ...s,
          messages: s.messages.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)),
        };
      }
      // For agent: try lastAgentMessageId; for thought: try lastThoughtMessageId
      const lastId = kind === 'agent' ? s.lastAgentMessageId : s.lastThoughtMessageId;
      if (!id && lastId && s.messages.find((m) => m.id === lastId)) {
        return {
          ...s,
          messages: s.messages.map((m) => (m.id === lastId ? { ...m, text: m.text + text } : m)),
        };
      }
      const newId = id ?? `${sid}:${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...s,
        inProgress: true,
        lastAgentMessageId: kind === 'agent' ? newId : s.lastAgentMessageId,
        lastThoughtMessageId: kind === 'thought' ? newId : s.lastThoughtMessageId,
        messages: [...s.messages, { id: newId, kind, text, timestamp: Date.now() }],
      };
    });
  }

  private updateToolMessage(_sid: string, u: any) {
    const id = u.toolCallId;
    this.set((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.toolCallId === id
          ? {
              ...m,
              toolStatus: u.status ?? m.toolStatus,
              toolDiff: this.extractDiff(u.content) ?? m.toolDiff,
              toolOutput: this.extractOutput(u.content) || m.toolOutput,
              toolLocations: u.locations ?? m.toolLocations,
            }
          : m,
      ),
    }));
  }

  // actions
  send(
    text: string,
    images: Array<{ data: string; mimeType: string }> = [],
    resources: Array<{ uri: string; mimeType?: string; text?: string }> = [],
  ) {
    this.set((s) => ({
      ...s,
      inProgress: true,
      messages: [
        ...s.messages,
        { id: `local:${Date.now()}`, kind: 'user', text, timestamp: Date.now() },
      ],
    }));
    vscode.postMessage({ type: 'prompt', text, images, resources });
  }

  cancel() {
    this.set((s) => ({ ...s, inProgress: false }));
    vscode.postMessage({ type: 'cancel' });
  }

  newSession(mode: 'code' | 'chat' = 'code') {
    vscode.postMessage({ type: 'new-session', mode });
  }

  setMode(mode: 'code' | 'chat') {
    this.set((s) => ({ ...s, mode }));
    vscode.postMessage({ type: 'set-mode', mode });
  }

  openFile(path: string) {
    vscode.postMessage({ type: 'open-file', path });
  }

  respondPermission(optionId: string | 'cancel') {
    // The actual response is sent by the host (via session/request_permission callback).
    // The host is in charge of resolving the in-flight request.
    this.set((s) => ({ ...s, permissionRequest: null }));
    // Forward to host so it can resolve
    vscode.postMessage({ type: 'permission-response', optionId });
  }

  clearError() {
    this.set((s) => ({ ...s, error: null }));
  }

  clearInfo() {
    this.set((s) => ({ ...s, info: null }));
  }

  clearInlineEdit() {
    this.set((s) => ({ ...s, inlineEditRequest: null }));
  }

  loadSkills() {
    vscode.postMessage({ type: 'load-skills' });
  }
  loadMcp() {
    vscode.postMessage({ type: 'load-mcp' });
  }
  toggleMcp(name: string, enabled: boolean) {
    vscode.postMessage({ type: 'toggle-mcp', name, enabled });
  }

  installMcp(name: string) {
    vscode.postMessage({ type: 'install-mcp', name });
  }

  removeMcp(name: string) {
    vscode.postMessage({ type: 'remove-mcp', name });
  }

  addMcpServer(
    config:
      | { name: string; command: string; args: string[] }
      | { name: string; url: string; type: string },
  ) {
    vscode.postMessage({ type: 'add-mcp', config });
  }

  testMcpConnection(name: string) {
    vscode.postMessage({ type: 'test-mcp', name });
  }

  loadMcpTools(name: string) {
    vscode.postMessage({ type: 'load-mcp-tools', name });
  }

  openMcpInstallForm(type: 'registry' | 'custom') {
    this.set((s) => ({ ...s, installForm: { open: true, type } }));
  }

  closeMcpInstallForm() {
    this.set((s) => ({ ...s, installForm: { open: false, type: 'registry' as const } }));
  }

  clearMcpError() {
    this.set((s) => ({ ...s, mcpError: null }));
  }

  setModel(provider: string, model: string, customModel?: string) {
    vscode.postMessage({ type: 'set-model', provider, model, customModel });
  }

  revertModel() {
    const prev = this.state.previousModel;
    if (prev) {
      vscode.postMessage({
        type: 'set-model',
        provider: prev.provider ?? '',
        model: prev.model ?? '',
      });
    }
  }

  getCatalog() {
    vscode.postMessage({ type: 'get-catalog' });
  }

  validateModel() {
    vscode.postMessage({ type: 'validate-model' });
  }

  openConfigFile() {
    vscode.postMessage({ type: 'open-config-file' });
  }

  switchAgent(agent: string) {
    vscode.postMessage({ type: 'switch-agent', agent });
  }

  loadAgents() {
    vscode.postMessage({ type: 'load-agents' });
  }
}

// Auto-ping to prevent "Upstream idle timeout exceeded"
let pingInterval: ReturnType<typeof setInterval> | null = null;

function startAutoPing() {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    vscode.postMessage({ type: 'ping' });
  }, 50_000);
}

function stopAutoPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

// Start auto-ping when store is first used
if (typeof window !== 'undefined') {
  startAutoPing();
}

export const store = new Store();

export function useStore() {
  // useSyncExternalStore for reactivity on state; expose the store actions via
  // a stable proxy. Components can call store.send / store.cancel etc.
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  return Object.assign(state, {
    send: store.send.bind(store),
    cancel: store.cancel.bind(store),
    newSession: store.newSession.bind(store),
    setMode: store.setMode.bind(store),
    openFile: store.openFile.bind(store),
    respondPermission: store.respondPermission.bind(store),
    clearError: store.clearError.bind(store),
    clearInfo: store.clearInfo.bind(store),
    clearInlineEdit: store.clearInlineEdit.bind(store),
    loadSkills: store.loadSkills.bind(store),
    loadMcp: store.loadMcp.bind(store),
    toggleMcp: store.toggleMcp.bind(store),
    installMcp: store.installMcp.bind(store),
    removeMcp: store.removeMcp.bind(store),
    addMcpServer: store.addMcpServer.bind(store),
    testMcpConnection: store.testMcpConnection.bind(store),
    loadMcpTools: store.loadMcpTools.bind(store),
    openMcpInstallForm: store.openMcpInstallForm.bind(store),
    closeMcpInstallForm: store.closeMcpInstallForm.bind(store),
    clearMcpError: store.clearMcpError.bind(store),
    setModel: store.setModel.bind(store),
    revertModel: store.revertModel.bind(store),
    getCatalog: store.getCatalog.bind(store),
    validateModel: store.validateModel.bind(store),
    openConfigFile: store.openConfigFile.bind(store),
    switchAgent: store.switchAgent.bind(store),
    loadAgents: store.loadAgents.bind(store),
  });
}
