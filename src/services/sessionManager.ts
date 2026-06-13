// TODO: Integrar MCP profundamente - passar servidores MCP configurados na sessão
// TODO: Cache de configuração de modelo/sessão para evitar re-fetch
// TODO: Lazy load de toolsets baseado no contexto

import { acpManager } from '../acp/manager';
import { logger } from '../utils/logger';
import { workspaceContext } from './workspaceContext';

export interface SessionInfo {
  sessionId: string;
  cwd: string;
  title?: string;
  createdAt: number;
  mode?: 'code' | 'chat';
}

export interface PromptContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  resource?: { uri: string; mimeType?: string; text?: string };
}

interface McpServerStdio {
  name: string;
  type?: 'stdio';
  command: string;
  args: string[];
  env?: { name: string; value: string }[];
}
type McpServerConfig = McpServerStdio | { name: string; type: 'http' | 'sse'; url: string; headers: { name: string; value: string }[] };

class SessionManager {
  private sessions = new Map<string, SessionInfo>();
  private activeId: string | null = null;

  async create(opts?: { cwd?: string; mode?: 'code' | 'chat' }): Promise<SessionInfo> {
    const conn = acpManager.connection;
    if (!conn) throw new Error('ACP not connected');
    const ctx = workspaceContext.collect();
    const cwd = opts?.cwd ?? ctx.cwd;
    // Pass expanded toolsets to match CLI platform_toolsets.cli behavior
    // hermes-cli toolset may not be recognized by ACP adapter, so expand explicitly
    const cliToolsets = [
      'browser', 'clarify', 'code_execution', 'computer_use', 'context_engine',
      'cronjob', 'delegation', 'file', 'image_gen', 'memory', 'messaging',
      'moa', 'session_search', 'skills', 'terminal', 'todo', 'tts', 'video',
      'video_gen', 'vision', 'web',
    ];
    const resp = await conn.newSession({
      cwd,
      mcpServers: ctx.mcpServers as McpServerConfig[],
      toolsets: cliToolsets,
    });
    const info: SessionInfo = {
      sessionId: resp.sessionId,
      cwd,
      title: 'New session',
      createdAt: Date.now(),
      mode: opts?.mode ?? 'code',
    };
    this.sessions.set(info.sessionId, info);
    this.activeId = info.sessionId;
    acpManager.setCurrentSession(info.sessionId);
    logger.info(`session created: ${info.sessionId} cwd=${cwd}`);
    return info;
  }

  async resume(sessionId: string, cwd?: string): Promise<SessionInfo> {
    const conn = acpManager.connection;
    if (!conn) throw new Error('ACP not connected');
    const ctx = workspaceContext.collect();
    const cliToolsets = [
      'browser', 'clarify', 'code_execution', 'computer_use', 'context_engine',
      'cronjob', 'delegation', 'file', 'image_gen', 'memory', 'messaging',
      'moa', 'session_search', 'skills', 'terminal', 'todo', 'tts', 'video',
      'video_gen', 'vision', 'web',
    ];
    await conn.loadSession({
      sessionId,
      cwd: cwd ?? ctx.cwd,
      mcpServers: ctx.mcpServers as McpServerConfig[],
      toolsets: cliToolsets,
    });
    let info = this.sessions.get(sessionId);
    if (!info) {
      info = {
        sessionId,
        cwd: cwd ?? ctx.cwd,
        title: 'Resumed session',
        createdAt: Date.now(),
      };
      this.sessions.set(sessionId, info);
    }
    this.activeId = sessionId;
    acpManager.setCurrentSession(sessionId);
    return info;
  }

  async list(): Promise<SessionInfo[]> {
    return [...this.sessions.values()];
  }

  async sendPrompt(content: PromptContent[]): Promise<{ stopReason: string }> {
    const conn = acpManager.connection;
    if (!conn) throw new Error('ACP not connected');
    if (!this.activeId) throw new Error('No active session');
    const resp = await conn.prompt({
      sessionId: this.activeId,
      prompt: content,
    });
    return { stopReason: resp.stopReason };
  }

  async cancel(): Promise<void> {
    const conn = acpManager.connection;
    if (!conn || !this.activeId) return;
    try {
      await conn.cancel({ sessionId: this.activeId });
    } catch (e: any) {
      // Hermes 0.15.1 does not implement session/cancel (-32601). Fall back
      // to sending a notification if the SDK supports it, otherwise just log.
      if (e?.code === -32601 || /not\s*found|not\s*implemented/i.test(e?.message ?? '')) {
        logger.warn('agent does not implement session/cancel; ignoring');
        return;
      }
      throw e;
    }
  }

  async setMode(mode: 'code' | 'chat'): Promise<void> {
    const conn = acpManager.connection;
    if (!conn || !this.activeId) return;
    await conn.setSessionMode({ sessionId: this.activeId, modeId: mode });
    const s = this.sessions.get(this.activeId);
    if (s) s.mode = mode;
  }

  async setTitle(sessionId: string, title: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) s.title = title;
  }

  getActive(): SessionInfo | null {
    return this.activeId ? this.sessions.get(this.activeId) ?? null : null;
  }

  setActive(id: string) {
    this.activeId = id;
    acpManager.setCurrentSession(id);
  }
}

export const sessionManager = new SessionManager();
