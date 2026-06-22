/**
 * Curated, hand-verified list of free-tier models per provider, used by
 * the Setup wizard's model picker. We do NOT auto-fetch a live catalog
 * here — that would require network in the extension host and a fragile
 * schema. The list is intentionally small: stick to providers whose free
 * tier is stable and well-documented.
 *
 * Each entry has:
 *   id          — the model id passed to the provider (e.g. what hermes sends)
 *   label       — human-readable name
 *   ctx         — context window
 *   free        — true if available on the provider's free tier
 *   notes       — short caveat / tip
 */
export interface CatalogEntry {
  id: string;
  label: string;
  ctx?: string;
  free: boolean;
  notes?: string;
}

export interface ProviderCatalog {
  id: string;
  label: string;
  envVars: string[]; // which env vars in .env gate this provider
  baseUrl: string; // hermes model.base_url value for this provider
  models: CatalogEntry[];
}

export const CATALOG: ProviderCatalog[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envVars: ['OPENROUTER_API_KEY'],
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'nvidia/nemotron-3-super-120b-a12b:free',
        label: 'Nemotron 3 Super 120B (free)',
        ctx: '1M',
        free: true,
        notes: 'OpenRouter free route of NVIDIA Nemotron 3 Super.',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'Llama 3.3 70B (free)',
        ctx: '128k',
        free: true,
        notes: 'OpenRouter free route of Llama 3.3 70B.',
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct:free',
        label: 'Qwen 2.5 Coder 32B (free)',
        ctx: '32k',
        free: true,
        notes: 'Code-specialized 32B.',
      },
      {
        id: 'mistralai/mistral-large-2-instruct',
        label: 'Mistral Large 2 (123B)',
        ctx: '128k',
        free: true,
        notes: 'Mistral flagship model via OpenRouter.',
      },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envVars: ['OPENAI_API_KEY'],
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        ctx: '128k',
        free: false,
        notes: 'Cheapest paid OpenAI model.',
      },
      { id: 'gpt-4o', label: 'GPT-4o', ctx: '128k', free: false },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', ctx: '1M', free: false },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-3-5-haiku-latest',
        label: 'Claude 3.5 Haiku',
        ctx: '200k',
        free: false,
        notes: 'Cheapest Anthropic.',
      },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', ctx: '200k', free: false },
    ],
  },
  {
    id: 'nous',
    label: 'Nous Portal',
    envVars: ['NOUS_API_KEY'],
    baseUrl: 'https://api.nousresearch.com/v1',
    models: [
      { id: 'hermes-4-405b', label: 'Hermes 4 405B (Nous Portal)', ctx: '128k', free: false },
    ],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    envVars: ['NVIDIA_API_KEY'],
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: [
      {
        id: 'nvidia/llama-3.3-nemotron-super-49b-v1',
        label: 'Nemotron Super 49B v1',
        ctx: '128k',
        free: true,
        notes: 'Modelo principal NVIDIA. Key deve começar com nvapi-. V1 confirmado funcional.',
      },
      {
        id: 'deepseek-ai/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        ctx: '1M',
        free: true,
        notes: '1M context window, muito rápido.',
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        label: 'Llama 3.1 70B',
        ctx: '131k',
        free: true,
        notes: 'Modelo grande Meta, confirmado online.',
      },
      {
        id: 'meta/llama-3.2-11b-vision-instruct',
        label: 'Llama 3.2 11B Vision',
        ctx: '131k',
        free: true,
        notes: 'Suporte a imagens (vision).',
      },
      {
        id: 'meta/llama-3.2-3b-instruct',
        label: 'Llama 3.2 3B',
        ctx: '131k',
        free: true,
        notes: 'Pequeno e rápido.',
      },
      {
        id: 'meta/llama-3.2-1b-instruct',
        label: 'Llama 3.2 1B',
        ctx: '131k',
        free: true,
        notes: 'Ultra-leve, para tasks simples.',
      },
      {
        id: 'meta/llama-guard-4-12b',
        label: 'Llama Guard 4 12B',
        ctx: '128k',
        free: true,
        notes: 'Modelo de segurança/filtro de conteúdo.',
      },
      {
        id: 'minimaxai/minimax-m2.7',
        label: 'MiniMax M2.7',
        ctx: '205k',
        free: true,
        notes: '230B MoE, 205k context.',
      },
      {
        id: 'qwen/qwen3.5-122b-a10b',
        label: 'Qwen 3.5 122B',
        ctx: '262k',
        free: true,
        notes: '262k context, suporte a imagens.',
      },
      {
        id: 'qwen/qwen3.5-397b-a17b',
        label: 'Qwen 3.5 397B',
        ctx: '262k',
        free: true,
        notes: 'Modelo mais grande Qwen.',
      },
      {
        id: 'stepfun-ai/step-3.5-flash',
        label: 'Step 3.5 Flash',
        ctx: '262k',
        free: true,
        notes: '262k context.',
      },
      {
        id: 'stepfun-ai/step-3.7-flash',
        label: 'Step 3.7 Flash',
        ctx: '256k',
        free: true,
        notes: '256k context, suporte a imagens.',
      },
      {
        id: 'zhipuai/glm-5',
        label: 'GLM-5 (Zhipu)',
        ctx: '128k',
        free: true,
        notes: 'Modelo chinês Zhipu AI.',
      },
    ],
  },
  {
    id: 'opencode',
    label: 'OpenCode Zen',
    envVars: ['OPENCODE_ZEN_API_KEY'],
    baseUrl: 'https://opencode.ai/zen/v1',
    models: [
      {
        id: 'deepseek-v4-flash-free',
        label: 'DeepSeek V4 Flash Free (gratuito)',
        ctx: '1M',
        free: true,
        notes: 'FREE via OpenCode Zen. Mesmo modelo que o Unify endpoint 6 usa.',
      },
      {
        id: 'deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        ctx: '1M',
        free: false,
        notes: 'Versão paga, mais rápida que a Flash Free.',
      },
      {
        id: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro',
        ctx: '1M',
        free: false,
        notes: 'Máximo de performance DeepSeek.',
      },
      {
        id: 'glm-5',
        label: 'GLM-5 (Zhipu)',
        ctx: '128k',
        free: false,
        notes: 'GLM-5 via OpenCode Zen.',
      },
      {
        id: 'glm-5.1',
        label: 'GLM-5.1 (Zhipu)',
        ctx: '128k',
        free: false,
        notes: 'GLM-5.1 via OpenCode Zen.',
      },
    ],
  },
  {
    id: 'synthetic',
    label: 'Synthetic',
    envVars: ['SYNTHETIC_API_KEY'],
    baseUrl: 'https://api.synthetic.new/openai/v1',
    models: [
      {
        id: 'syn:small:text',
        label: 'Synthetic Small Text',
        ctx: '—',
        free: false,
        notes: '$0.0000001/token. Modelo próprio Synthetic mais barato.',
      },
      {
        id: 'syn:large:text',
        label: 'Synthetic Large Text',
        ctx: '—',
        free: false,
        notes: '$0.0000014/token. Modelo próprio Synthetic grande.',
      },
      {
        id: 'syn:small:vision',
        label: 'Synthetic Small Vision',
        ctx: '—',
        free: false,
        notes: '$0.00000045/token. Modelo vision pequeno.',
      },
      {
        id: 'syn:large:vision',
        label: 'Synthetic Large Vision',
        ctx: '—',
        free: false,
        notes: '$0.00000095/token. Modelo vision grande.',
      },
      {
        id: 'hf:openai/gpt-oss-120b',
        label: 'GPT-OSS 120B',
        ctx: '—',
        free: false,
        notes: '$0.0000001/token. Open-source 120B via Synthetic.',
      },
      {
        id: 'hf:zai-org/GLM-5.1',
        label: 'GLM-5.1 (Zhipu)',
        ctx: '—',
        free: false,
        notes: '$0.000001/token. GLM-5.1 via Synthetic.',
      },
      {
        id: 'hf:zai-org/GLM-5.2',
        label: 'GLM-5.2 (Zhipu)',
        ctx: '—',
        free: false,
        notes: '$0.0000014/token. GLM-5.2 via Synthetic.',
      },
      {
        id: 'hf:zai-org/GLM-4.7',
        label: 'GLM-4.7 (Zhipu)',
        ctx: '—',
        free: false,
        notes: '$0.00000045/token. GLM-4.7 via Synthetic.',
      },
      {
        id: 'hf:zai-org/GLM-4.7-Flash',
        label: 'GLM-4.7 Flash (Zhipu)',
        ctx: '—',
        free: false,
        notes: '$0.0000001/token. GLM-4.7 Flash rápido.',
      },
      {
        id: 'hf:moonshotai/Kimi-K2.6',
        label: 'Kimi K2.6 (Moonshot)',
        ctx: '—',
        free: false,
        notes: '$0.00000095/token. Kimi K2.6 via Synthetic.',
      },
      {
        id: 'hf:Qwen/Qwen3.5-397B-A17B',
        label: 'Qwen 3.5 397B',
        ctx: '—',
        free: false,
        notes: '$0.0000006/token. Qwen 3.5 397B MoE.',
      },
      {
        id: 'hf:Qwen/Qwen3.6-27B',
        label: 'Qwen 3.6 27B',
        ctx: '—',
        free: false,
        notes: '$0.00000045/token. Qwen 3.6 27B.',
      },
      {
        id: 'hf:MiniMaxAI/MiniMax-M3',
        label: 'MiniMax M3',
        ctx: '—',
        free: false,
        notes: '$0.0000006/token. MiniMax M3 via Synthetic.',
      },
      {
        id: 'hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4',
        label: 'Nemotron 3 Super 120B',
        ctx: '—',
        free: false,
        notes: '$0.0000003/token. Nemotron 3 Super 120B via Synthetic.',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom (digitar ID manualmente)',
    envVars: [],
    baseUrl: '',
    models: [
      {
        id: '__custom__',
        label: 'Digitar ID…',
        free: true,
        notes: 'Use this for any model not in the list.',
      },
    ],
  },
];

export function findProvider(id: string): ProviderCatalog | undefined {
  return CATALOG.find((p) => p.id === id);
}

export function findModel(providerId: string, modelId: string): CatalogEntry | undefined {
  return findProvider(providerId)?.models.find((m) => m.id === modelId);
}
