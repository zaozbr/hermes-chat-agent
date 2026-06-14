export class HermesAgentProvider {
  constructor() {
    this.initializeProviders();
  }

  initializeProviders() {
    this.providers = {
      'deepseek-v4-flash-free': {
        name: '[FREE] DeepSeek V4 Flash Free',
        provider: 'DeepSeek V4 Flash Free',
        model: 'deepseek-v4-flash-free',
        endpoint: 'https://api.deepseek.com/v1',
        auth: {
          method: 'api-key',
          apiKey: '$UCPSECRET:74693f0c-fe31-4d53-81e6-1211fe61858a$',
        },
        capabilities: {
          toolCalling: true,
          imageInput: false,
        },
        maxInputTokens: 128000,
        maxOutputTokens: 8192,
        stream: true,
        thinking: {
          type: 'enabled',
        },
      },
    };
  }

  async getProvider(modelId) {
    return this.providers[modelId] || null;
  }

  async getAllProviders() {
    return Object.values(this.providers);
  }

  async testConnection(provider) {
    try {
      const response = await fetch(provider.endpoint + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.auth.apiKey.replace('$UCPSECRET:', '').replace('$', '')}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }
}
