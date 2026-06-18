import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger';

const exec = promisify(execFile);

export interface McpServer {
  name: string;
  transport: 'stdio' | 'http' | 'sse' | 'unknown';
  enabled: boolean;
  raw: string;
}

export interface McpToolDefinition {
  name: string;
  description: string;
}

export interface McpServerDetail {
  server: McpServer;
  tools: McpToolDefinition[];
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  error?: string;
}

class McpService {
  /**
   * List all configured MCP servers via `hermes mcp list`.
   */
  async list(hermesPath: string): Promise<{ raw: string; parsed: McpServer[] }> {
    try {
      const { stdout } = await exec(hermesPath, ['mcp', 'list'], { timeout: 10000 });
      return { raw: stdout, parsed: parseMcp(stdout) };
    } catch (e) {
      logger.warn(`mcp list failed: ${(e as Error).message}`);
      return { raw: '', parsed: [] };
    }
  }

  /**
   * Enable an MCP server.
   */
  async enable(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'enable', name], { timeout: 10000 });
  }

  /**
   * Disable an MCP server.
   */
  async disable(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'disable', name], { timeout: 10000 });
  }

  /**
   * Install an MCP server from the registry.
   */
  async install(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'install', name, '--yes'], { timeout: 120000 });
  }

  /**
   * Add a custom MCP server configuration.
   * Supports both stdio and http/sse transports.
   */
  async add(
    hermesPath: string,
    name: string,
    config: { command?: string; args?: string[]; url?: string; type?: string },
  ): Promise<void> {
    const args: string[] = ['mcp', 'add', name];
    if (config.command) {
      args.push('--command', config.command);
      if (config.args && config.args.length > 0) {
        args.push('--args', ...config.args);
      }
    } else if (config.url) {
      args.push('--url', config.url);
      if (config.type) args.push('--type', config.type);
    }
    await exec(hermesPath, args, { timeout: 30000 });
  }

  /**
   * Remove an MCP server.
   */
  async remove(hermesPath: string, name: string): Promise<void> {
    await exec(hermesPath, ['mcp', 'remove', name], { timeout: 10000 });
  }

  /**
   * Test connection to an MCP server by listing its tools.
   * Returns the tools list and connection status.
   */
  async testConnection(
    hermesPath: string,
    name: string,
  ): Promise<{ ok: boolean; tools: McpToolDefinition[]; error?: string }> {
    try {
      const { stdout } = await exec(hermesPath, ['mcp', 'tools', name], { timeout: 15000 });
      const tools = parseMcpTools(stdout, name);
      return { ok: true, tools };
    } catch (e) {
      const msg = (e as Error).message;
      logger.warn(`mcp test connection failed for ${name}: ${msg}`);
      return { ok: false, tools: [], error: msg };
    }
  }

  /**
   * Get tools available on a specific MCP server.
   */
  async getTools(hermesPath: string, name: string): Promise<McpToolDefinition[]> {
    try {
      const { stdout } = await exec(hermesPath, ['mcp', 'tools', name], { timeout: 15000 });
      return parseMcpTools(stdout, name);
    } catch (e) {
      logger.warn(`mcp tools failed for ${name}: ${(e as Error).message}`);
      return [];
    }
  }
}

/**
 * Parse the `hermes mcp list` table output into structured McpServer objects.
 */
function parseMcp(text: string): McpServer[] {
  const out: McpServer[] = [];
  if (/no\s+mcp\s+servers\s+configured/i.test(text)) return out;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[┌├└]/.test(trimmed)) continue;
    if (/no\s+mcp\s+servers/i.test(trimmed)) continue;
    if (trimmed.startsWith('Add one with:') || trimmed.startsWith('hermes mcp')) continue;
    if (!trimmed.startsWith('│') || !trimmed.endsWith('│')) continue;
    const fields = trimmed
      .slice(1, -1)
      .split('│')
      .map((s) => s.trim());
    if (fields.length < 2) continue;
    const name = fields[0]!;
    const transportRaw = fields[1]!;
    const status = fields[2];
    let transport: McpServer['transport'] = 'unknown';
    if (/stdio/i.test(transportRaw ?? '')) transport = 'stdio';
    else if (/http/i.test(transportRaw ?? '')) transport = 'http';
    else if (/sse/i.test(transportRaw ?? '')) transport = 'sse';
    out.push({
      name,
      transport,
      enabled: /enabled/i.test(status ?? ''),
      raw: line,
    });
  }
  return out;
}

/**
 * Parse the `hermes mcp tools <name>` output into tool definitions.
 */
function parseMcpTools(text: string, _serverName: string): McpToolDefinition[] {
  const tools: McpToolDefinition[] = [];
  const lines = text.split(/\r?\n/);
  let currentName = '';
  let currentDesc = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Look for lines like:  tool_name: description or ## tool_name
    const nameMatch = trimmed.match(/^(?:##\s*)?([a-zA-Z_][a-zA-Z0-9_-]*)\s*[:\-]\s*(.+)/);
    if (nameMatch) {
      if (currentName) {
        tools.push({ name: currentName, description: currentDesc });
      }
      currentName = nameMatch[1]!;
      currentDesc = nameMatch[2]!;
    } else if (currentName) {
      // Continuation of previous description
      currentDesc += ' ' + trimmed;
    }
  }
  if (currentName) {
    tools.push({ name: currentName, description: currentDesc });
  }
  return tools;
}

export const mcpService = new McpService();
