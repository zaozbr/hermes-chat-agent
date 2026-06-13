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

class McpService {
  async list(hermesPath: string): Promise<{ raw: string; parsed: McpServer[] }> {
    try {
      const { stdout } = await exec(hermesPath, ['mcp', 'list'], { timeout: 10000 });
      return { raw: stdout, parsed: parseMcp(stdout) };
    } catch (e) {
      logger.warn(`mcp list failed: ${(e as Error).message}`);
      return { raw: '', parsed: [] };
    }
  }

  async enable(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'enable', name], { timeout: 10000 });
  }
  async disable(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'disable', name], { timeout: 10000 });
  }
  async install(hermesPath: string, name: string) {
    await exec(hermesPath, ['mcp', 'install', name, '--yes'], { timeout: 120000 });
  }
}

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
    const fields = trimmed.slice(1, -1).split('│').map((s) => s.trim());
    if (fields.length < 2) continue;
    const [name, transportRaw, status] = fields;
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

export const mcpService = new McpService();
