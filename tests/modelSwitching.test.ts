/**
 * ────────────────────────────────────────────────────────────────────────────
 * 🧪 Model Switching Tests — Hermes Agent
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Covers:
 *   1. modelCatalog.ts — data integrity and lookup functions
 *   2. hermesInstaller.setModel() — CLI command generation (mocked)
 *   3. hermesInstaller.getCurrentModel() — config.yaml reading (mocked)
 *   4. Cross-provider and cross-model switching scenarios
 *
 * These are PERMANENT tests. They run on every `npm test` / `npx vitest run`.
 * Always expand these when adding providers, models, or changing the switch
 * flow.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Must use vi.hoisted() so mock factories can reference these variables
// (vi.mock is hoisted to top of file; top-level vars are not yet defined).

const { mockProcessRunnerRun, mockFsAccess, mockFsReadFile, mockYamlLoad } = vi.hoisted(() => ({
  mockProcessRunnerRun: vi.fn(),
  mockFsAccess: vi.fn(),
  mockFsReadFile: vi.fn(),
  mockYamlLoad: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
  window: { showInformationMessage: () => undefined },
  Uri: { file: (p: string) => ({ fsPath: p }) },
}));

vi.mock('../src/services/processRunner', () => ({
  processRunner: {
    run: mockProcessRunnerRun,
  },
}));

vi.mock('node:fs/promises', () => ({
  access: mockFsAccess,
  readFile: mockFsReadFile,
}));

vi.mock('js-yaml', () => ({
  load: mockYamlLoad,
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import {
  CATALOG,
  findProvider,
  findModel,
  type ProviderCatalog,
  type CatalogEntry,
} from '../src/services/modelCatalog';
import { hermesInstaller } from '../src/services/hermesInstaller';

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — modelCatalog.ts: data integrity
// ════════════════════════════════════════════════════════════════════════════

describe('🧩 modelCatalog — data integrity', () => {
  it('has exactly 8 providers (openrouter, openai, anthropic, nous, nvidia, opencode, synthetic, custom)', () => {
    expect(CATALOG).toHaveLength(8);
    const ids = CATALOG.map((p) => p.id);
    expect(ids).toContain('openrouter');
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('nous');
    expect(ids).toContain('nvidia');
    expect(ids).toContain('opencode');
    expect(ids).toContain('synthetic');
    expect(ids).toContain('custom');
  });

  it('every provider has all required fields (id, label, envVars, baseUrl, models)', () => {
    for (const p of CATALOG) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(Array.isArray(p.envVars)).toBe(true);
      expect(typeof p.baseUrl).toBe('string');
      expect(Array.isArray(p.models)).toBe(true);
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it('every model in every provider has required fields (id, label)', () => {
    for (const p of CATALOG) {
      for (const m of p.models) {
        expect(m.id).toBeTruthy();
        expect(m.label).toBeTruthy();
        expect(typeof m.free).toBe('boolean');
      }
    }
  });

  it('no duplicate provider IDs', () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate model IDs within a provider', () => {
    for (const p of CATALOG) {
      const modelIds = p.models.map((m) => m.id);
      expect(new Set(modelIds).size).toBe(modelIds.length);
    }
  });

  it('free-tier providers (nvidia, opencode, openrouter) have at least one free model', () => {
    // Some providers are BYOK (bring-your-own-key) and have no free tier — that's OK.
    // The ones that advertise free models are: nvidia, opencode, openrouter.
    const freeProviders = ['nvidia', 'opencode', 'openrouter'];
    for (const id of freeProviders) {
      const p = CATALOG.find((prov) => prov.id === id);
      expect(p, `Provider ${id} not found in catalog`).toBeDefined();
      const hasFree = p!.models.some((m) => m.free);
      expect(hasFree, `Provider ${id} should have at least one free model`).toBe(true);
    }
  });

  it('custom provider has baseUrl="" and no envVars', () => {
    const custom = CATALOG.find((p) => p.id === 'custom');
    expect(custom).toBeDefined();
    expect(custom!.baseUrl).toBe('');
    expect(custom!.envVars).toEqual([]);
  });

  it('every free model has ctx defined and notes (informational)', () => {
    // Not strictly required, but good practice for user experience
    for (const p of CATALOG) {
      if (p.id === 'custom') continue;
      for (const m of p.models) {
        if (m.free) {
          expect(m.ctx).toBeTruthy();
        }
      }
    }
  });
});

describe('🧩 modelCatalog — lookup functions', () => {
  it('findProvider returns correct provider by id', () => {
    const p = findProvider('nvidia');
    expect(p).toBeDefined();
    expect(p!.id).toBe('nvidia');
    expect(p!.label).toBe('NVIDIA NIM');
  });

  it('findProvider returns undefined for unknown id', () => {
    expect(findProvider('nonexistent')).toBeUndefined();
  });

  it('findModel returns correct model from a provider', () => {
    const m = findModel('nvidia', 'meta/llama-3.1-70b-instruct');
    expect(m).toBeDefined();
    expect(m!.free).toBe(true);
    expect(m!.label).toContain('Llama');
  });

  it('findModel returns undefined for unknown provider', () => {
    expect(findModel('nope', 'some-model')).toBeUndefined();
  });

  it('findModel returns undefined for unknown model in valid provider', () => {
    expect(findModel('nvidia', 'fake-model-9000')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — hermesInstaller.setModel(): CLI command generation
// ════════════════════════════════════════════════════════════════════════════

describe('⚙️  hermesInstaller.setModel — CLI commands', () => {
  const hermesPath = 'hermes';
  const opencodeProvider = 'opencode';
  const opencodeModel = 'deepseek-v4-flash-free';
  const opencodeBaseUrl = 'https://opencode.ai/zen/v1';

  beforeEach(() => {
    // Default: all commands succeed
    mockProcessRunnerRun.mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      signal: null,
      timedOut: false,
      cancelled: false,
      durationMs: 10,
    });
    // Save original env
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls hermes config set model.provider and model.default with correct args', async () => {
    await hermesInstaller.setModel(hermesPath, opencodeProvider, opencodeModel);

    // First call: set provider
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', opencodeProvider],
      expect.objectContaining({ timeoutMs: 15_000 }),
    );

    // Second call: set model
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', opencodeModel],
      expect.objectContaining({ timeoutMs: 15_000 }),
    );

    // Only two calls — baseUrl not set
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(2);
  });

  it('calls hermes config set model.base_url when baseUrl is provided', async () => {
    await hermesInstaller.setModel(hermesPath, opencodeProvider, opencodeModel, opencodeBaseUrl);

    // Third call: set base_url
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      3,
      'config-set-base-url',
      hermesPath,
      ['config', 'set', 'model.base_url', opencodeBaseUrl],
      expect.objectContaining({ timeoutMs: 15_000 }),
    );

    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(3);
  });

  it('does not call base_url when baseUrl is undefined', async () => {
    await hermesInstaller.setModel(hermesPath, opencodeProvider, opencodeModel);
    // Check no call with 'model.base_url'
    const calls = mockProcessRunnerRun.mock.calls.filter(
      (c: any[]) => c[2] && c[2].includes('model.base_url'),
    );
    expect(calls).toHaveLength(0);
  });

  it('throws if provider is empty', async () => {
    await expect(hermesInstaller.setModel(hermesPath, '', opencodeModel)).rejects.toThrow(
      'provider is required',
    );
    expect(mockProcessRunnerRun).not.toHaveBeenCalled();
  });

  it('throws if model is empty', async () => {
    await expect(hermesInstaller.setModel(hermesPath, opencodeProvider, '')).rejects.toThrow(
      'model id is required',
    );
    expect(mockProcessRunnerRun).not.toHaveBeenCalled();
  });

  it('throws if first command (set provider) fails', async () => {
    mockProcessRunnerRun.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'error: permission denied',
      signal: null,
      timedOut: false,
      cancelled: false,
      durationMs: 5,
    });

    await expect(
      hermesInstaller.setModel(hermesPath, opencodeProvider, opencodeModel),
    ).rejects.toThrow('hermes config set model.provider failed');
    // Only first call was made
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(1);
  });

  it('throws if second command (set model) fails', async () => {
    let callCount = 0;
    mockProcessRunnerRun.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({
          exitCode: 1,
          stdout: '',
          stderr: 'invalid model name',
          signal: null,
          timedOut: false,
          cancelled: false,
          durationMs: 5,
        });
      }
      return Promise.resolve({
        exitCode: 0,
        stdout: '',
        stderr: '',
        signal: null,
        timedOut: false,
        cancelled: false,
        durationMs: 10,
      });
    });

    await expect(
      hermesInstaller.setModel(hermesPath, opencodeProvider, opencodeModel),
    ).rejects.toThrow('hermes config set model.default failed');
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — hermesInstaller.getCurrentModel(): config.yaml reading
// ════════════════════════════════════════════════════════════════════════════

describe('⚙️  hermesInstaller.getCurrentModel — config reading', () => {
  const fakeConfigPath = '/fake/home/hermes/config.yaml';

  beforeEach(() => {
    // Make access succeed for the fake path
    mockFsAccess.mockResolvedValue(undefined);
    // Make findHermesConfigPath find the correct path
    // The function checks candidates — we make the first accessible one work
    // by making all succeed, and the first win.
    // We also set HERMES_HOME to control the first candidate
    process.env['HERMES_HOME'] = '/fake/home/hermes';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env['HERMES_HOME'];
  });

  it('returns provider and model from a valid config.yaml', async () => {
    mockFsReadFile.mockResolvedValue(
      'model:\n  provider: nvidia\n  default: deepseek-ai/deepseek-v4-flash\n',
    );
    mockYamlLoad.mockReturnValue({
      model: { provider: 'nvidia', default: 'deepseek-ai/deepseek-v4-flash' },
    });

    const result = await hermesInstaller.getCurrentModel();

    expect(result.provider).toBe('nvidia');
    expect(result.model).toBe('deepseek-ai/deepseek-v4-flash');
  });

  it('returns empty object when config.yaml is missing (fs.access throws)', async () => {
    // Make all access calls fail
    mockFsAccess.mockRejectedValue(new Error('ENOENT'));

    const result = await hermesInstaller.getCurrentModel();

    expect(result.provider).toBeUndefined();
    expect(result.model).toBeUndefined();
  });

  it('returns empty object when config.yaml has no model section', async () => {
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReadFile.mockResolvedValue('some_other_key: value\n');
    mockYamlLoad.mockReturnValue({ some_other_key: 'value' });

    const result = await hermesInstaller.getCurrentModel();

    expect(result.provider).toBeUndefined();
    expect(result.model).toBeUndefined();
  });

  it('returns empty object when config.yaml parse fails', async () => {
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReadFile.mockRejectedValue(new Error('parse error'));

    const result = await hermesInstaller.getCurrentModel();

    expect(result.provider).toBeUndefined();
    expect(result.model).toBeUndefined();
  });

  it('returns provider without model when only model.provider is set', async () => {
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReadFile.mockResolvedValue('model:\n  provider: openrouter\n');
    mockYamlLoad.mockReturnValue({
      model: { provider: 'openrouter' },
    });

    const result = await hermesInstaller.getCurrentModel();

    expect(result.provider).toBe('openrouter');
    expect(result.model).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Model switching scenarios (cross-provider, cross-model)
// ════════════════════════════════════════════════════════════════════════════

describe('🔄 Model switching scenarios', () => {
  const hermesPath = 'hermes';

  beforeEach(() => {
    mockProcessRunnerRun.mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      signal: null,
      timedOut: false,
      cancelled: false,
      durationMs: 10,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── 4a: Switch between different providers ───────────────────────

  it('switches from OpenRouter to NVIDIA NIM (different providers)', async () => {
    // OpenRouter → NVIDIA
    await hermesInstaller.setModel(
      hermesPath,
      'openrouter',
      'meta-llama/llama-3.3-70b-instruct:free',
    );

    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'openrouter'],
      expect.anything(),
    );

    // Then switch to NVIDIA
    vi.clearAllMocks();
    await hermesInstaller.setModel(
      hermesPath,
      'nvidia',
      'meta/llama-3.1-70b-instruct',
      'https://integrate.api.nvidia.com/v1',
    );

    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'nvidia'],
      expect.anything(),
    );
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      3,
      'config-set-base-url',
      hermesPath,
      ['config', 'set', 'model.base_url', 'https://integrate.api.nvidia.com/v1'],
      expect.anything(),
    );
  });

  it('switches from NVIDIA NIM to OpenCode Zen (different providers)', async () => {
    await hermesInstaller.setModel(hermesPath, 'nvidia', 'meta/llama-3.2-3b-instruct');
    expect(mockProcessRunnerRun).toHaveBeenCalledWith(
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'meta/llama-3.2-3b-instruct'],
      expect.anything(),
    );

    vi.clearAllMocks();
    await hermesInstaller.setModel(hermesPath, 'opencode', 'deepseek-v4-flash-free');
    expect(mockProcessRunnerRun).toHaveBeenCalledWith(
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'deepseek-v4-flash-free'],
      expect.anything(),
    );
  });

  // ─── 4b: Switch between free models of the SAME provider ──────────

  it('switches between free models of NVIDIA NIM (same provider)', async () => {
    // Nemotron → DeepSeek V4 Flash
    await hermesInstaller.setModel(
      hermesPath,
      'nvidia',
      'nvidia/nemotron-super-49b-v1.5',
      'https://integrate.api.nvidia.com/v1',
    );

    vi.clearAllMocks();

    // DeepSeek V4 Flash → Llama 3.1 70B
    await hermesInstaller.setModel(hermesPath, 'nvidia', 'meta/llama-3.1-70b-instruct');
    // Provider should be the same: nvidia
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'nvidia'],
      expect.anything(),
    );
    // Model changed
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'meta/llama-3.1-70b-instruct'],
      expect.anything(),
    );

    vi.clearAllMocks();

    // Llama 3.1 → Step 3.5 Flash (different free model, same provider)
    await hermesInstaller.setModel(hermesPath, 'nvidia', 'stepfun-ai/step-3.5-flash');
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'stepfun-ai/step-3.5-flash'],
      expect.anything(),
    );
  });

  it('switches between free models of OpenRouter (same provider)', async () => {
    // OpenRouter free models: Nemotron 3 Super, Llama 3.3, Qwen Coder, Mistral Large 2
    await hermesInstaller.setModel(
      hermesPath,
      'openrouter',
      'nvidia/nemotron-3-super-120b-a12b:free',
    );

    vi.clearAllMocks();

    await hermesInstaller.setModel(
      hermesPath,
      'openrouter',
      'qwen/qwen-2.5-coder-32b-instruct:free',
    );
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'qwen/qwen-2.5-coder-32b-instruct:free'],
      expect.anything(),
    );
  });

  // ─── 4c: Switch between free models of DIFFERENT providers ────────

  it('switches from OpenRouter free model to NVIDIA free model (different providers)', async () => {
    await hermesInstaller.setModel(hermesPath, 'openrouter', 'mistralai/mistral-large-2-instruct');

    vi.clearAllMocks();

    await hermesInstaller.setModel(hermesPath, 'nvidia', 'qwen/qwen3.5-122b-a10b');

    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'nvidia'],
      expect.anything(),
    );
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'qwen/qwen3.5-122b-a10b'],
      expect.anything(),
    );
  });

  it('switches from NVIDIA free model to OpenCode Zen free model (different providers)', async () => {
    await hermesInstaller.setModel(hermesPath, 'nvidia', 'minimaxai/minimax-m2.7');

    vi.clearAllMocks();

    await hermesInstaller.setModel(
      hermesPath,
      'opencode',
      'deepseek-v4-flash-free',
      'https://opencode.ai/zen/v1',
    );

    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'opencode'],
      expect.anything(),
    );
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      2,
      'config-set-model',
      hermesPath,
      ['config', 'set', 'model.default', 'deepseek-v4-flash-free'],
      expect.anything(),
    );
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      3,
      'config-set-base-url',
      hermesPath,
      ['config', 'set', 'model.base_url', 'https://opencode.ai/zen/v1'],
      expect.anything(),
    );
  });

  // ─── 4d: Round-trip switching (A → B → A) ────────────────────────

  it('performs a round-trip switch: OpenCode Zen → NVIDIA → OpenCode Zen', async () => {
    // Step 1: Set OpenCode Zen
    await hermesInstaller.setModel(
      hermesPath,
      'opencode',
      'deepseek-v4-flash-free',
      'https://opencode.ai/zen/v1',
    );
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(3);

    vi.clearAllMocks();

    // Step 2: Switch to NVIDIA
    await hermesInstaller.setModel(
      hermesPath,
      'nvidia',
      'meta/llama-3.2-3b-instruct',
      'https://integrate.api.nvidia.com/v1',
    );
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(3);
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'nvidia'],
      expect.anything(),
    );

    vi.clearAllMocks();

    // Step 3: Switch back to OpenCode Zen
    await hermesInstaller.setModel(
      hermesPath,
      'opencode',
      'deepseek-v4-flash-free',
      'https://opencode.ai/zen/v1',
    );
    expect(mockProcessRunnerRun).toHaveBeenCalledTimes(3);
    expect(mockProcessRunnerRun).toHaveBeenNthCalledWith(
      1,
      'config-set-provider',
      hermesPath,
      ['config', 'set', 'model.provider', 'opencode'],
      expect.anything(),
    );
  });
});
