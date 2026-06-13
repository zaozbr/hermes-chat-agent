import * as vscode from 'vscode';
import { logger } from '../utils/logger';

const BASE_URL_KEY = 'hermes-base-urls';

class ConfigService {
  private globalState: vscode.Memento | null = null;

  init(context: vscode.ExtensionContext) {
    this.globalState = context.globalState;
  }

  /** Get stored base URL for a provider (undefined if not set) */
  getBaseUrl(provider: string): string | undefined {
    if (!this.globalState) return undefined;
    const urls = this.globalState.get<Record<string, string>>(BASE_URL_KEY, {});
    return urls[provider];
  }

  /** Set base URL for a provider */
  async setBaseUrl(provider: string, baseUrl: string): Promise<void> {
    if (!this.globalState) throw new Error('ConfigService not initialized');
    const urls = this.globalState.get<Record<string, string>>(BASE_URL_KEY, {});
    urls[provider] = baseUrl;
    await this.globalState.update(BASE_URL_KEY, urls);
    logger.info(`base URL stored for provider ${provider}: ${baseUrl}`);
  }

  /** Delete stored base URL for a provider */
  async deleteBaseUrl(provider: string): Promise<void> {
    if (!this.globalState) return;
    const urls = this.globalState.get<Record<string, string>>(BASE_URL_KEY, {});
    delete urls[provider];
    await this.globalState.update(BASE_URL_KEY, urls);
    logger.info(`base URL deleted for provider ${provider}`);
  }

  /** Get all stored base URLs */
  getAllBaseUrls(): Record<string, string> {
    if (!this.globalState) return {};
    return this.globalState.get<Record<string, string>>(BASE_URL_KEY, {});
  }
}

export const configService = new ConfigService();
