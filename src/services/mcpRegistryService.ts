import { logger } from '../utils/logger';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface McpRegistrySource {
  id: string;
  label: string;
  description: string;
  url: string;
  serversUrl: string; // API endpoint to fetch servers
  type: 'mcp-registry' | 'smithery' | 'github-awesome' | 'custom';
  enabled: boolean;
}

export interface RegistryServer {
  id: string;
  name: string;
  description: string;
  transport: 'stdio' | 'http' | 'sse' | 'unknown';
  command?: string;
  args?: string[];
  url?: string;
  installType: 'command' | 'url';
  source: string; // registry ID
  sourceLabel: string; // human-readable source name
  toolCount?: number;
  tags?: string[];
  homepage?: string;
}

export interface RegistryFetchResult {
  source: string;
  servers: RegistryServer[];
  error?: string;
}

/* ─── Default registry sources ──────────────────────────────────────────── */

const DEFAULT_REGISTRIES: McpRegistrySource[] = [
  {
    id: 'smithery',
    label: 'Smithery',
    description: 'Smithery.ai — the largest MCP server registry',
    url: 'https://smithery.ai',
    serversUrl: 'https://smithery.ai/api/v1/servers',
    type: 'smithery',
    enabled: true,
  },
  {
    id: 'mcp-registry',
    label: 'MCP Registry',
    description: 'Official Model Context Protocol server registry',
    url: 'https://registry.modelcontextprotocol.io',
    serversUrl: 'https://registry.modelcontextprotocol.io/api/servers',
    type: 'mcp-registry',
    enabled: true,
  },
  {
    id: 'github-awesome',
    label: 'Awesome MCP',
    description: 'Community-curated MCP servers list on GitHub',
    url: 'https://github.com/punkpeye/awesome-mcp-servers',
    serversUrl: 'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md',
    type: 'github-awesome',
    enabled: true,
  },
];

/* ─── Service ────────────────────────────────────────────────────────────── */

class McpRegistryService {
  /**
   * Returns all pre-configured registries.
   */
  getRegistries(): McpRegistrySource[] {
    return DEFAULT_REGISTRIES.map((r) => ({ ...r }));
  }

  /**
   * Fetch available servers from a specific registry source.
   */
  async fetchServers(source: McpRegistrySource): Promise<RegistryFetchResult> {
    try {
      logger.info(`mcpRegistry: fetching servers from ${source.id} (${source.serversUrl})`);
      const response = await fetch(source.serversUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json, text/markdown, text/plain' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();

      switch (source.type) {
        case 'smithery':
          return this.parseSmithery(text, source);
        case 'mcp-registry':
          return this.parseMcpRegistry(text, source);
        case 'github-awesome':
          return this.parseGithubAwesome(text, source);
        default:
          return this.parseGenericJson(text, source);
      }
    } catch (e) {
      const msg = (e as Error).message;
      logger.warn(`mcpRegistry: failed to fetch ${source.id}: ${msg}`);
      return { source: source.id, servers: [], error: msg };
    }
  }

  /**
   * Fetch servers from ALL enabled registries in parallel.
   */
  async fetchAll(
    registries: McpRegistrySource[] = DEFAULT_REGISTRIES,
  ): Promise<RegistryFetchResult[]> {
    const enabled = registries.filter((r) => r.enabled);
    const results = await Promise.allSettled(enabled.map((r) => this.fetchServers(r)));
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        source: enabled[i]?.id ?? 'unknown',
        servers: [],
        error: r.reason?.message ?? 'Unknown error',
      };
    });
  }

  /* ─── Parsers ─────────────────────────────────────────────────────────── */

  private parseSmithery(text: string, source: McpRegistrySource): RegistryFetchResult {
    try {
      const data = JSON.parse(text);
      // Smithery API returns { servers: [...] } or directly an array
      const items = Array.isArray(data) ? data : (data.servers ?? data.data ?? []);
      const servers: RegistryServer[] = items.map((s: any) => ({
        id: s.id ?? s.slug ?? s.name ?? '',
        name: s.name ?? s.slug ?? 'unknown',
        description: (s.description ?? '').slice(0, 300),
        transport: this.guessTransport(s),
        command: s.command ?? s.installation?.command ?? s.startCommand?.[0],
        args: s.args ?? s.installation?.args ?? s.startCommand?.slice(1),
        url: s.url ?? s.installation?.url,
        installType: s.command || s.installation?.command ? 'command' : 'url',
        source: source.id,
        sourceLabel: source.label,
        toolCount: s.toolCount ?? s.tools?.length,
        tags: s.tags ?? s.categories ?? [],
        homepage: s.homepage ?? s.url ?? s.repository,
      }));
      return { source: source.id, servers };
    } catch (e) {
      return { source: source.id, servers: [], error: `Parse error: ${(e as Error).message}` };
    }
  }

  private parseMcpRegistry(text: string, source: McpRegistrySource): RegistryFetchResult {
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : (data.servers ?? data.data ?? data.results ?? []);
      const servers: RegistryServer[] = items.map((s: any) => ({
        id: s.id ?? s.name ?? '',
        name: s.name ?? s.id ?? 'unknown',
        description: (s.description ?? '').slice(0, 300),
        transport: this.guessTransport(s),
        command: s.command ?? s.installation?.command,
        args: s.args ?? s.installation?.args,
        url: s.url ?? s.installation?.url,
        installType: s.command || s.installation?.command ? 'command' : 'url',
        source: source.id,
        sourceLabel: source.label,
        toolCount: s.toolCount ?? s.tools?.length,
        tags: s.tags ?? s.categories ?? [],
        homepage: s.homepage ?? s.url ?? s.repository,
      }));
      return { source: source.id, servers };
    } catch (e) {
      return { source: source.id, servers: [], error: `Parse error: ${(e as Error).message}` };
    }
  }

  private parseGithubAwesome(text: string, source: McpRegistrySource): RegistryFetchResult {
    // Parse markdown table of MCP servers from the awesome list
    const servers: RegistryServer[] = [];
    const lines = text.split(/\r?\n/);
    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      // Detect markdown table rows
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        if (cells.length >= 2 && cells[0] && cells[0] !== '---' && !cells[0].includes('Name')) {
          const name = cells[0].replace(/[*`\[\]]/g, '').trim();
          const desc = cells.length >= 2 ? (cells[1] ?? '').replace(/[*`]/g, '').trim() : '';
          // Try to extract install command from description
          const cmdMatch = desc.match(/`(npx|pip|npm|uvx|dotnet)\s+([^`]+)`/);
          if (cmdMatch) {
            servers.push({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name,
              description: desc.slice(0, 300),
              transport: 'stdio',
              command: cmdMatch[1] ?? '',
              args: (cmdMatch[2] ?? '').split(/\s+/),
              installType: 'command',
              source: source.id,
              sourceLabel: source.label,
              homepage: this.extractUrl(cells[0]),
            });
          } else {
            servers.push({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name,
              description: desc.slice(0, 300),
              transport: 'unknown',
              installType: 'command',
              source: source.id,
              sourceLabel: source.label,
            });
          }
        }
        inTable = true;
      } else if (inTable && !trimmed) {
        // Empty line ends table
        inTable = false;
      }
    }
    return { source: source.id, servers };
  }

  private parseGenericJson(text: string, source: McpRegistrySource): RegistryFetchResult {
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : (data.servers ?? data.data ?? data.results ?? []);
      const servers: RegistryServer[] = items.map((s: any) => ({
        id: s.id ?? s.name ?? '',
        name: s.name ?? s.id ?? 'unknown',
        description: (s.description ?? '').slice(0, 300),
        transport: this.guessTransport(s),
        command: s.command ?? s.installation?.command,
        args: s.args ?? s.installation?.args,
        url: s.url ?? s.installation?.url,
        installType: s.command || s.installation?.command ? 'command' : 'url',
        source: source.id,
        sourceLabel: source.label,
        toolCount: s.toolCount ?? s.tools?.length,
        tags: s.tags ?? s.categories ?? [],
        homepage: s.homepage ?? s.url ?? s.repository,
      }));
      return { source: source.id, servers };
    } catch (e) {
      return { source: source.id, servers: [], error: `Parse error: ${(e as Error).message}` };
    }
  }

  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  private guessTransport(s: any): RegistryServer['transport'] {
    const raw = [s.transport, s.type, s.protocol, s.installation?.type, s.installation?.transport]
      .find(Boolean)
      ?.toString()
      .toLowerCase();
    if (!raw) return 'unknown';
    if (raw.includes('stdio')) return 'stdio';
    if (raw.includes('http') || raw.includes('sse')) return raw.includes('sse') ? 'sse' : 'http';
    // If it has a command, assume stdio
    if (s.command || s.installation?.command) return 'stdio';
    // If it has a url, assume http
    if (s.url || s.installation?.url) return 'http';
    return 'unknown';
  }

  private extractUrl(cell: string): string | undefined {
    const m = cell.match(/\(((https?:\/\/)[^)]+)\)/);
    return m?.[1];
  }

  /**
   * Build the install config to pass to mcpService.add() from a RegistryServer.
   */
  buildInstallConfig(server: RegistryServer): {
    name: string;
    command?: string;
    args?: string[];
    url?: string;
    type?: string;
  } {
    if (server.installType === 'url' && server.url) {
      return {
        name: server.name,
        url: server.url,
        type: server.transport === 'sse' ? 'sse' : 'http',
      };
    }
    return {
      name: server.name,
      command: server.command,
      args: server.args,
    };
  }
}

export const mcpRegistryService = new McpRegistryService();
