import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { vscode } from '../utils/vscode';

/** Provider-specific URL for API key generation */
function getKeyUrl(providerId: string): string {
  const urls: Record<string, string> = {
    opencode: 'https://opencode.ai/zen',
    openrouter: 'https://openrouter.ai/keys',
    nvidia: 'https://build.nvidia.com',
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/',
    nous: 'https://portal.nousresearch.com',
    google: 'https://aistudio.google.com/apikey',
    groq: 'https://console.groq.com/keys',
    together: 'https://api.together.ai/settings/api-keys',
    mistral: 'https://console.mistral.ai/api-keys/',
    fireworks: 'https://fireworks.ai/api-keys',
    deepseek: 'https://platform.deepseek.com/api_keys',
    synthetic: 'https://synthetic.new/settings',
  };
  return urls[providerId] ?? `https://console.${providerId}.com`;
}

/** Step-by-step guide for getting a free API key for a given provider */
function getProviderGuide(providerId: string, providerLabel: string): string[] {
  const guides: Record<string, string[]> = {
    opencode: [
      `1. Acesse ${getKeyUrl('opencode')}`,
      '2. Crie uma conta gratuita (ou faça login)',
      '3. No painel, copie sua API Key (começa com "sk-")',
      '4. Cole a chave no campo abaixo e clique em "Salvar API Key"',
    ],
    openrouter: [
      '1. Acesse https://openrouter.ai/keys',
      '2. Crie uma conta gratuita',
      '3. Clique em "Create Key" e dê um nome',
      '4. Copie a chave gerada (começa com "sk-or-")',
      '5. Cole no campo abaixo e clique em "Salvar API Key"',
    ],
    nvidia: [
      '1. Acesse https://build.nvidia.com',
      '2. Crie uma conta gratuita (ou faça login com Google/GitHub)',
      '3. Vá em "API" no menu superior → "Get API Key"',
      '4. Copie sua chave (começa com "nvapi-")',
      '5. Cole no campo abaixo e clique em "Salvar API Key"',
    ],
  };
  const steps = guides[providerId];
  if (steps) return steps;
  return [
    `1. Acesse ${getKeyUrl(providerId)}`,
    `2. Crie uma conta gratuita na ${providerLabel}`,
    '3. Gere uma API Key no painel do provedor',
    '4. Copie a chave e cole no campo abaixo',
  ];
}

export function Onboarding() {
  const s = useStore();
  return (
    <div className="onboarding">
      <header>
        <h2>🐍 Hermes — Setup</h2>
      </header>

      {s.info && (
        <div className="banner info" onClick={() => s.clearInfo()}>
          ℹ {s.info} <small>(clique para fechar)</small>
        </div>
      )}

      {/* ── Section 1: Detecção ─────────────────────────────────── */}
      <section>
        <h3>1. Detecção</h3>
        {s.detection?.found ? (
          <div className="ok">
            ✓ <code>{s.detection.path}</code>
            {s.detection.version && <span className="muted"> (v{s.detection.version})</span>}
          </div>
        ) : (
          <div className="warn">
            ⚠ <code>hermes</code> não está no PATH nem em local conhecido.
          </div>
        )}
        <div className="row">
          <button onClick={() => vscode.postMessage({ type: 're-detect' })}>🔄 Re-detectar</button>
          <button onClick={() => s.openConfigFile()}>📄 Abrir config.yaml</button>
        </div>
      </section>

      {!s.detection?.found && (
        <section>
          <h3>2. Instalar Hermes</h3>
          <p>
            Hermes é distribuído como <code>hermes-agent</code> no PyPI. Recomendado instalar via{' '}
            <code>pipx</code> (ou <code>pip --user</code>).
          </p>
          <pre className="cmd">
            {`pip install --user hermes-agent[acp]
hermes postinstall`}
          </pre>
          <div className="row">
            <button onClick={() => vscode.postMessage({ type: 'open-install-terminal' })}>
              📟 Abrir terminal de instalação
            </button>
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            ⚠ Por segurança, a extensão <strong>não</strong> executa o TUI interativo
            <code>hermes setup</code> diretamente — ele pode travar o host. Use o terminal.
          </p>
        </section>
      )}

      {/* ── Section 2: Configuração (modelo + chave + auto-setup) ── */}
      <section>
        <h3>{s.detection?.found ? '2. Configuração' : '3. Configuração'}</h3>
        <ConfigurationSection />
      </section>

      {/* ── Section : Recursos ──────────────────────────────────── */}
      <section>
        <h3>{s.detection?.found ? '3. Recursos' : '4. Recursos'}</h3>
        <ul>
          <li>
            <a href="https://hermes-agent.nousresearch.com">Site oficial</a>
          </li>
          <li>
            <a href="https://github.com/NousResearch/hermes-agent">GitHub</a>
          </li>
          <li>
            <a href="https://agentclientprotocol.com">Agent Client Protocol</a>
          </li>
          <li>
            <a href="https://build.nvidia.com">NVIDIA NIM (free models)</a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function StepRow({
  step,
  log,
  onRun,
  onCancel,
}: {
  step: { id: string; label: string; description: string; status: string; detail?: string };
  log: string;
  onRun: () => void;
  onCancel: () => void;
}) {
  const isRunning = step.status === 'running';
  return (
    <li className={`step ${step.status}`}>
      <div className="step-status">
        {step.status === 'pending' && '○'}
        {step.status === 'running' && '⟳'}
        {step.status === 'done' && '✓'}
        {step.status === 'failed' && '✗'}
        {step.status === 'skipped' && '–'}
      </div>
      <div className="step-body">
        <strong>{step.label}</strong>
        <p className="muted">{step.description}</p>
        {step.detail && step.status === 'failed' && <pre className="err">{step.detail}</pre>}
        {step.detail && step.status === 'done' && (
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            → {step.detail}
          </p>
        )}
        {log && (
          <details>
            <summary>log ({log.length} chars)</summary>
            <pre className="out">{log.slice(-8000)}</pre>
          </details>
        )}
      </div>
      <div className="step-actions">
        {isRunning ? (
          <button onClick={onCancel} title="Cancelar este passo">
            ⏹ Cancelar
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={step.status === 'done'}
            title={step.status === 'done' ? 'Já concluído' : 'Rodar este passo'}
          >
            {step.status === 'failed' ? '↻ Tentar' : 'Rodar'}
          </button>
        )}
      </div>
    </li>
  );
}

/** Configuration sub-component: provider/model picker + API key + auto-setup */
function ConfigurationSection() {
  const s = useStore();

  useEffect(() => {
    s.getCatalog();
  }, []);

  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    if (s.modelStatus.provider && !provider) setProvider(s.modelStatus.provider);
    if (s.modelStatus.model && !model) setModel(s.modelStatus.model);
  }, [s.modelStatus.provider, s.modelStatus.model]);

  const providerEntry = s.catalog.find((p) => p.id === provider);
  const isCustom = model === '__custom__';
  const canSubmit = provider && (isCustom ? customModel.trim() : model);
  const isConfigured = providerEntry?.configured ?? false;
  const hasEnvVar = (providerEntry?.envVars?.length ?? 0) > 0;
  const guideSteps = provider ? getProviderGuide(provider, providerEntry?.label ?? provider) : [];

  function submit() {
    if (!canSubmit) return;
    s.setModel(provider, isCustom ? '__custom__' : model, customModel.trim());
  }

  async function handleSaveApiKey() {
    if (!provider || !apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      s.setApiKey(provider, apiKeyInput.trim());
      setApiKeyInput('');
    } finally {
      setSavingKey(false);
    }
  }

  function openUrl(url: string) {
    vscode.postMessage({ type: 'open-url', url });
  }

  return (
    <div>
      {s.modelStatus.configured ? (
        <div className="ok" style={{ marginBottom: 12 }}>
          ✓ <strong>{s.modelStatus.provider}</strong> / <code>{s.modelStatus.model}</code>
        </div>
      ) : (
        <div className="warn" style={{ marginBottom: 12 }}>
          ⚠ Modelo não configurado. Escolha abaixo:
        </div>
      )}

      {/* ── Provider + Model pickers ───────────────────────────── */}
      <div className="picker">
        <label>
          Provedor:
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel('');
              setApiKeyInput('');
            }}
          >
            <option value="">— escolha —</option>
            {s.catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.configured ? '🔓 ' : '🔒 '}
                {p.label}
                {p.envVars.length > 0 ? ` (chave${p.configured ? ' ✓' : ' ✗'})` : ''}
              </option>
            ))}
          </select>
        </label>

        {providerEntry && providerEntry.models.length > 0 && (
          <label>
            Modelo:
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="">— escolha —</option>
              {providerEntry.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.free ? ' ✓ free' : ''}
                  {m.ctx ? ` · ${m.ctx}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {isCustom && (
          <label>
            ID do modelo:
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="ex: meta/llama-3.3-70b-instruct"
            />
          </label>
        )}
      </div>

      {/* ── API Key input + guide (shown when provider selected) ─ */}
      {provider && hasEnvVar && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid var(--vscode-input-border, #ccc)',
            borderRadius: 6,
            background: 'var(--vscode-editor-background, #1e1e1e)',
          }}
        >
          <h4 style={{ margin: '0 0 8px' }}>
            {isConfigured ? '🔓 Chave de API configurada' : '🔑 Configurar chave de API'}
          </h4>

          {!isConfigured && (
            <>
              {/* Step-by-step guide */}
              <div style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                <strong>📖 Como obter sua chave grátis:</strong>
                <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {guideSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <button
                  onClick={() => openUrl(getKeyUrl(provider))}
                  style={{ marginTop: 8, fontSize: 12 }}
                >
                  🌐 Abrir página de API Keys
                </button>
              </div>

              {/* API Key password input */}
              <label style={{ display: 'block', marginBottom: 8 }}>
                <strong>🔑 {providerEntry?.envVars?.[0] ?? 'API Key'}:</strong>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={`Cole sua chave de API aqui`}
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 4,
                    padding: '6px 8px',
                  }}
                />
              </label>

              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || savingKey}
                style={{ background: 'var(--vscode-button-background, #007acc)', color: '#fff' }}
              >
                {savingKey ? '💾 Salvando...' : '💾 Salvar API Key'}
              </button>

              <p style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                A chave será salva no cofre de secrets do VS Code e sincronizada com o{' '}
                <code>.env</code> da Hermes.
              </p>
            </>
          )}

          {isConfigured && (
            <div>
              <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                ✅ API Key já configurada para <strong>{providerEntry?.label}</strong>. Deseja
                substituir?
              </p>
              <button
                onClick={() => openUrl(getKeyUrl(provider))}
                style={{ fontSize: 12, marginRight: 8 }}
              >
                🌐 Abrir página de API Keys
              </button>
              <details>
                <summary style={{ fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                  🔑 Substituir chave
                </summary>
                <label style={{ display: 'block', marginTop: 8 }}>
                  <strong>Nova chave:</strong>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Cole a nova chave aqui"
                    style={{
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box',
                      marginTop: 4,
                      padding: '6px 8px',
                    }}
                  />
                </label>
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim() || savingKey}
                  style={{
                    marginTop: 8,
                    background: 'var(--vscode-button-background, #007acc)',
                    color: '#fff',
                  }}
                >
                  {savingKey ? '💾 Salvando...' : '💾 Substituir API Key'}
                </button>
              </details>
            </div>
          )}
        </div>
      )}

      {/* ── Salvar modelo ──────────────────────────────────────── */}
      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={submit} disabled={!canSubmit}>
          💾 Salvar no config.yaml
        </button>
        <button onClick={() => s.validateModel()}>🔍 Testar (hermes status)</button>
      </div>

      {s.modelValidation && (
        <div className={s.modelValidation.ok ? 'ok' : 'warn'} style={{ marginTop: 8 }}>
          {s.modelValidation.ok ? '✓' : '⚠'} {s.modelValidation.detail}
        </div>
      )}

      {/* ── Auto Setup (integrado) ─────────────────────────────── */}
      <div
        style={{
          marginTop: 20,
          padding: 12,
          border: '1px solid var(--vscode-input-border, #ccc)',
          borderRadius: 6,
        }}
      >
        <h4 style={{ margin: '0 0 4px' }}>⚙️ Auto Setup</h4>
        <p className="muted" style={{ fontSize: 11, margin: '0 0 8px' }}>
          Executa todos os passos de instalação pendentes (detecção, dependências, etc.).
          {!isConfigured && (
            <strong style={{ color: 'var(--vscode-errorForeground, #f14c4c)' }}>
              {' '}
              ⚠ Configure a API Key e o modelo antes de rodar.
            </strong>
          )}
        </p>
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            onClick={() => vscode.postMessage({ type: 'run-all-install-steps' })}
            style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}
          >
            ▶ Iniciar Auto Setup (Executa tudo)
          </button>
        </div>
        <ol className="steps">
          {s.installSteps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              log={s.stepLogs[step.id] ?? ''}
              onRun={() => vscode.postMessage({ type: 'run-install-step', id: step.id })}
              onCancel={() => vscode.postMessage({ type: 'cancel-install-step', id: step.id })}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
