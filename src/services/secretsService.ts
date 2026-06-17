import * as vscode from 'vscode';
import { logger } from '../utils/logger';

const SECRET_PREFIX = 'hermes-api-key:';

class SecretsService {
  private storage: vscode.SecretStorage | null = null;

  init(context: vscode.ExtensionContext) {
    this.storage = context.secrets;
  }

  async setKey(provider: string, apiKey: string): Promise<void> {
    if (!this.storage) throw new Error('SecretStorage not initialized');
    if (!provider || !apiKey) throw new Error('provider and apiKey are required');
    await this.storage.store(`${SECRET_PREFIX}${provider}`, apiKey);
    logger.info(`API key stored for provider: ${provider}`);
  }

  async getKey(provider: string): Promise<string | null> {
    if (!this.storage) return null;
    const key = await this.storage.get(`${SECRET_PREFIX}${provider}`);
    return key || null;
  }

  async deleteKey(provider: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.delete(`${SECRET_PREFIX}${provider}`);
    logger.info(`API key deleted for provider: ${provider}`);
  }

  async listProviders(): Promise<string[]> {
    if (!this.storage) return [];
    // VS Code SecretStorage doesn't have a list method
    // We track keys separately
    return [];
  }

  /** Get all stored keys as env vars map (for injection into hermes process) */
  async getEnvVars(): Promise<Record<string, string>> {
    const env: Record<string, string> = {};
    // Known providers and their env var names
    const providers = [
      { id: 'opencode', envVar: 'OPENCODE_ZEN_API_KEY' },
      { id: 'nvidia', envVar: 'NVIDIA_API_KEY' },
      { id: 'openrouter', envVar: 'OPENROUTER_API_KEY' },
      { id: 'openai', envVar: 'OPENAI_API_KEY' },
      { id: 'anthropic', envVar: 'ANTHROPIC_API_KEY' },
      { id: 'nous', envVar: 'NOUS_API_KEY' },
      { id: 'google', envVar: 'GOOGLE_API_KEY' },
      { id: 'groq', envVar: 'GROQ_API_KEY' },
      { id: 'together', envVar: 'TOGETHER_API_KEY' },
      { id: 'mistral', envVar: 'MISTRAL_API_KEY' },
      { id: 'fireworks', envVar: 'FIREWORKS_API_KEY' },
      { id: 'deepseek', envVar: 'DEEPSEEK_API_KEY' },
    ];
    for (const p of providers) {
      const key = await this.getKey(p.id);
      if (key) {
        env[p.envVar] = key;
      }
    }
    return env;
  }
}

export const secretsService = new SecretsService();
