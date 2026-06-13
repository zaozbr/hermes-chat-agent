import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { logger } from '../utils/logger';

export interface AgentProfile {
  name: string;
  description: string;
  mode: string;
  color?: string;
}

const AGENT_COLORS: Record<string, string> = {
  build: '#4caf50',
  plan: '#2196f3',
  general: '#9c27b0',
  explore: '#ff9800',
  compaction: '#607d8b',
  title: '#795548',
  summary: '#009688',
};

const DEFAULT_AGENTS: AgentProfile[] = [
  { name: 'build', description: 'Principal para código e alterações', mode: 'primary', color: '#4caf50' },
  { name: 'plan', description: 'Planejamento e análise', mode: 'primary', color: '#2196f3' },
  { name: 'general', description: 'Conversas gerais', mode: 'primary', color: '#9c27b0' },
  { name: 'explore', description: 'Exploração de código', mode: 'primary', color: '#ff9800' },
];

class AgentsService {
  async list(): Promise<AgentProfile[]> {
    try {
      const configPath = path.join(os.homedir(), '.hermes', 'config.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);
      const agentConfig = config?.agent;
      if (agentConfig && typeof agentConfig === 'object') {
        return Object.entries(agentConfig).map(([name, cfg]: [string, any]) => ({
          name,
          description: cfg?.description ?? '',
          mode: cfg?.mode ?? 'subagent',
          color: AGENT_COLORS[name] ?? cfg?.color ?? '#666',
        }));
      }
    } catch (e) {
      logger.debug(`agent list from config: ${(e as Error).message} (using defaults)`);
    }
    return DEFAULT_AGENTS;
  }

  getDefaultAgents(): AgentProfile[] {
    return DEFAULT_AGENTS;
  }
}

export const agentsService = new AgentsService();
