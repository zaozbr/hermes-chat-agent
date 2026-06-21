import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../state/store';
import { vscode } from '../../utils/vscode';

type WizardStep = 'detect' | 'provider' | 'apikey' | 'model' | 'verify';

interface ApiKeyStatus {
  configured: boolean;
}
interface WizardState {
  step: WizardStep;
  provider: string;
  model: string;
  apiKeys: Record<string, boolean>;
  verifying: boolean;
  verifyResult: { ok: boolean; detail: string } | null;
}

const FREE_PROVIDER_HINT: Record<string, string> = {
  opencode: 'Chave gratuita — pegue em https://opencode.ai',
  nvidia: 'Key gratuita — começa com nvapi-, pegue em https://build.nvidia.com',
  openrouter: 'Key gratuita — pegue em https://openrouter.ai',
};

function getFreeModelCount(provider: { models?: Array<{ free?: boolean }> } | undefined): number {
  return provider?.models?.filter((m) => m.free)?.length ?? 0;
}

export function SetupPanel({ s }: { s: ReturnType<typeof useStore> }) {
  const [mode, setMode] = useState<'wizard' | 'advanced'>('wizard');
  const [w, setW] = useState<WizardState>({
    step: 'detect',
    provider: '',
    model: '',
    apiKeys: {},
    verifying: false,
    verifyResult: null,
  });
  const [configText, setConfigText] = useState('');
  const [configLoading, setConfigLoading] = useState(false);

  // Load catalog + api key statuses on mount
  useEffect(() => {
    s.getCatalog();
    vscode.postMessage({ type: 'list-api-keys' });
    vscode.postMessage({ type: 'get-config' });
  }, []);

  // Listen for messages
  useEffect(() => {
    function handler(e: MessageEvent) {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'api-keys-list':
          setW((prev) => ({ ...prev, apiKeys: msg.statuses ?? {} }));
          break;
        case 'api-key-saved':
          // Refresh key list
          vscode.postMessage({ type: 'list-api-keys' });
          break;
        case 'api-key-deleted':
          vscode.postMessage({ type: 'list-api-keys' });
          break;
        case 'model-validation':
          setW((prev) => ({
            ...prev,
            verifying: false,
            verifyResult: { ok: !!msg.ok, detail: msg.detail ?? '' },
          }));
          break;
        case 'model-status':
          // Model was set successfully, update the verify step
          if (msg.configured && msg.provider && msg.model) {
            setW((prev) => ({
              ...prev,
              provider: prev.provider || msg.provider,
              model: prev.model || msg.model,
              verifyResult: { ok: true, detail: `${msg.provider}/${msg.model}` },
            }));
          }
          break;
        case 'config-data':
          setConfigText(msg.text ?? '');
          setConfigLoading(false);
          break;
        case 'info':
          // Auto-advance after API key is saved
          if (msg.message?.includes('Chave') || msg.message?.includes('API')) {
            break;
          }
          break;
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const goTo = useCallback((step: WizardStep) => {
    setW((prev) => ({ ...prev, step, verifyResult: null }));
  }, []);

  const handleSelectProvider = useCallback((providerId: string) => {
    setW((prev) => ({ ...prev, provider: providerId, model: '' }));
    // If moving to next step after provider selection
    setTimeout(() => setW((prev) => ({ ...prev, step: 'apikey' })), 100);
  }, []);

  const handleSaveApiKey = useCallback((providerId: string, key: string) => {
    if (!key.trim()) return;
    vscode.postMessage({ type: 'save-api-key', provider: providerId, apiKey: key.trim() });
    // Wait briefly then advance to model step
    setTimeout(() => setW((prev) => ({ ...prev, step: 'model' })), 600);
  }, []);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setW((prev) => ({ ...prev, model: modelId }));
      if (w.provider && modelId) {
        s.setModel(w.provider, modelId);
        setTimeout(() => setW((prev) => ({ ...prev, step: 'verify' })), 400);
      }
    },
    [w.provider, s],
  );

  const handleVerify = useCallback(() => {
    setW((prev) => ({ ...prev, verifying: true, verifyResult: null }));
    s.validateModel();
  }, [s]);

  function saveConfig() {
    vscode.postMessage({ type: 'save-config', text: configText });
  }

  // Check if current provider has API key
  const providerHasKey = w.provider ? w.apiKeys[w.provider] : false;
  const catalogEntry = s.catalog.find((p) => p.id === w.provider);
  const freeModels = catalogEntry?.models?.filter((m) => m.free) ?? [];

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>✦ Setup</h3>
        <p className="muted">Configure provedores e modelos passo a passo.</p>
        <nav className="setup-mode-tabs">
          <button
            type="button"
            className={`setup-tab ${mode === 'wizard' ? 'active' : ''}`}
            onClick={() => setMode('wizard')}
          >
            🧙 Assistente guiado
          </button>
          <button
            type="button"
            className={`setup-tab ${mode === 'advanced' ? 'active' : ''}`}
            onClick={() => setMode('advanced')}
          >
            📝 Avançado (config.yaml)
          </button>
        </nav>
      </div>
      <div className="panel-body">
        {mode === 'advanced' ? (
          <>
            <textarea
              className="config-editor"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
              placeholder="# Configuração do Hermes"
            />
            <div className="inline-flex-row">
              <button onClick={saveConfig}>💾 Salvar</button>
              <button onClick={() => vscode.postMessage({ type: 'open-config-file' })}>
                📂 Abrir no editor
              </button>
            </div>
          </>
        ) : (
          <div className="wizard">
            {/* Step progress */}
            <div className="wizard-steps">
              {(['detect', 'provider', 'apikey', 'model', 'verify'] as WizardStep[]).map(
                (step, i) => {
                  const labels: Record<WizardStep, string> = {
                    detect: 'Detectar',
                    provider: 'Provedor',
                    apikey: 'API Key',
                    model: 'Modelo',
                    verify: 'Verificar',
                  };
                  const stepIdx = ['detect', 'provider', 'apikey', 'model', 'verify'].indexOf(
                    w.step,
                  );
                  const currentIdx = ['detect', 'provider', 'apikey', 'model', 'verify'].indexOf(
                    step,
                  );
                  const isActive = currentIdx === stepIdx;
                  const isDone = currentIdx < stepIdx;
                  return (
                    <div
                      key={step}
                      className={`wizard-step-indicator ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    >
                      <span className="wizard-step-num">{isDone ? '✓' : i + 1}</span>
                      <span className="wizard-step-label">{labels[step]}</span>
                    </div>
                  );
                },
              )}
            </div>

            <div className="wizard-content">
              {/* STEP 1: DETECT */}
              {w.step === 'detect' && (
                <div className="wizard-step-content">
                  <h4>🔍 Detectando Hermes</h4>
                  <p className="muted">
                    O Hermes Agent é o motor que conecta o VS Code aos modelos de IA.
                  </p>
                  {s.detection?.found ? (
                    <div className="ok-box">
                      <span className="ok-icon">✓</span>
                      <div>
                        <strong>Hermes detectado</strong>
                        <code>{s.detection.path}</code>
                        {s.detection.version && (
                          <span className="muted">v{s.detection.version}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="warn-box">
                      <span className="warn-icon">⚠</span>
                      <div>
                        <strong>Hermes não encontrado</strong>
                        <p className="muted">
                          Instale via terminal: <code>pip install --user hermes-agent[acp]</code> e
                          depois <code>hermes postinstall</code>
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="inline-flex-row wizard-gap">
                    <button onClick={() => vscode.postMessage({ type: 're-detect' })}>
                      🔄 Re-detectar
                    </button>
                    <button onClick={() => vscode.postMessage({ type: 'open-install-terminal' })}>
                      📟 Terminal de instalação
                    </button>
                    <button
                      className="primary"
                      onClick={() => goTo('provider')}
                      disabled={!s.detection?.found}
                    >
                      ➡ Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PROVIDER */}
              {w.step === 'provider' && (
                <div className="wizard-step-content">
                  <h4>🏢 Escolha um Provedor</h4>
                  <p className="muted">Selecione um provedor com modelo gratuito para começar.</p>
                  {s.catalog.length === 0 ? (
                    <p className="muted">Carregando catálogo…</p>
                  ) : (
                    <div className="provider-cards">
                      {s.catalog
                        .filter((p) => p.models?.length > 0)
                        .map((p) => {
                          const freeCount = getFreeModelCount(p);
                          const hint = FREE_PROVIDER_HINT[p.id];
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`provider-card ${w.provider === p.id ? 'selected' : ''}`}
                              onClick={() => handleSelectProvider(p.id)}
                            >
                              <div className="provider-card-header">
                                <strong>{p.label}</strong>
                                {w.apiKeys[p.id] && (
                                  <span className="configured-badge">✓ Configurado</span>
                                )}
                              </div>
                              {freeCount > 0 && (
                                <span className="free-badge">{freeCount} grátis</span>
                              )}
                              {hint && <p className="xsmall-muted">{hint}</p>}
                              <p className="xsmall-muted">
                                {p.models.length} modelo{p.models.length !== 1 ? 's' : ''}
                              </p>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  <div className="inline-flex-row wizard-gap">
                    <button onClick={() => goTo('detect')}>← Voltar</button>
                  </div>
                </div>
              )}

              {/* STEP 3: API KEY */}
              {w.step === 'apikey' && (
                <ApiKeyStep
                  providerId={w.provider}
                  catalogEntry={catalogEntry}
                  providerHasKey={providerHasKey}
                  onSave={handleSaveApiKey}
                  onBack={() => goTo('provider')}
                  onSkip={() => {
                    if (providerHasKey) goTo('model');
                  }}
                  s={s}
                />
              )}

              {/* STEP 4: MODEL */}
              {w.step === 'model' && (
                <div className="wizard-step-content">
                  <h4>🧠 Escolha um Modelo</h4>
                  {freeModels.length === 0 ? (
                    <p className="muted">Nenhum modelo gratuito encontrado para este provedor.</p>
                  ) : (
                    <div className="model-cards">
                      {freeModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`model-card ${w.model === m.id ? 'selected' : ''}`}
                          onClick={() => handleSelectModel(m.id)}
                        >
                          <div className="model-card-header">
                            <strong>{m.label}</strong>
                            <span className="free-badge">GRÁTIS</span>
                          </div>
                          {m.ctx && <span className="xsmall-muted">{m.ctx} contexto</span>}
                          {m.notes && <p className="xsmall-muted">{m.notes}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="inline-flex-row" style={{ marginTop: 16 }}>
                    <button onClick={() => goTo('apikey')}>← Voltar</button>
                  </div>
                </div>
              )}

              {/* STEP 5: VERIFY */}
              {w.step === 'verify' && (
                <div className="wizard-step-content">
                  <h4>✅ Verificar Configuração</h4>
                  <div className="verify-summary">
                    <div className="verify-row">
                      <span className="verify-label">Provedor:</span>
                      <span className="verify-value">{catalogEntry?.label ?? w.provider}</span>
                    </div>
                    <div className="verify-row">
                      <span className="verify-label">Modelo:</span>
                      <span className="verify-value">{w.model}</span>
                    </div>
                    <div className="verify-row">
                      <span className="verify-label">API Key:</span>
                      <span className="verify-value">
                        {providerHasKey ? '✓ Configurada' : '⚠ Não configurada'}
                      </span>
                    </div>
                  </div>

                  {w.verifyResult && (
                    <div className={`verify-result ${w.verifyResult.ok ? 'ok' : 'error'}`}>
                      {w.verifyResult.ok ? '✓' : '⚠'} {w.verifyResult.detail}
                    </div>
                  )}

                  <div className="inline-flex-row" style={{ marginTop: 16 }}>
                    <button onClick={() => goTo('model')}>← Voltar</button>
                    <button className="primary" onClick={handleVerify} disabled={w.verifying}>
                      {w.verifying ? '⏳ Verificando…' : '🔍 Testar conexão'}
                    </button>
                    <button onClick={() => vscode.postMessage({ type: 'open-onboarding' })}>
                      📖 Ver tutoriais
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── API Key Step subcomponent ─── */

function ApiKeyStep({
  providerId,
  catalogEntry,
  providerHasKey,
  onSave,
  onBack,
  onSkip,
  s,
}: {
  providerId: string;
  catalogEntry: ReturnType<typeof useStore>['catalog'][number] | undefined;
  providerHasKey: boolean;
  onSave: (provider: string, key: string) => void;
  onBack: () => void;
  onSkip: () => void;
  s: ReturnType<typeof useStore>;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hint = FREE_PROVIDER_HINT[providerId];

  function handleSave() {
    if (!keyInput.trim()) return;
    setSaving(true);
    onSave(providerId, keyInput);
    setSaved(true);
    setTimeout(() => setSaving(false), 500);
  }

  // If already configured, show status
  if (providerHasKey && !saved) {
    return (
      <div className="wizard-step-content">
        <h4>🔑 API Key</h4>
        <div className="ok-box">
          <span className="ok-icon">✓</span>
          <div>
            <strong>API Key já configurada</strong>
            <p className="muted">{catalogEntry?.label ?? providerId} já tem uma chave salva.</p>
          </div>
        </div>
        <div className="inline-flex-row" style={{ marginTop: 16 }}>
          <button onClick={onBack}>← Voltar</button>
          <button className="primary" onClick={onSkip}>
            ➡ Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <h4>🔑 Configurar API Key</h4>
      <p className="muted">{catalogEntry?.label ?? providerId} precisa de uma chave de API.</p>
      {hint && (
        <p className="small-muted" style={{ marginBottom: 12 }}>
          💡 {hint}
        </p>
      )}
      {catalogEntry?.envVars && catalogEntry.envVars.length > 0 && (
        <p className="xsmall-muted" style={{ marginBottom: 8 }}>
          Variável{catalogEntry.envVars.length > 1 ? 's' : ''} de ambiente:{' '}
          <code>{catalogEntry.envVars.join(', ')}</code>
        </p>
      )}
      <div className="api-key-input-row">
        <input
          type="password"
          className="api-key-input wide"
          placeholder="Cole sua chave de API aqui…"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          autoFocus
        />
        <button
          className="primary save-btn"
          onClick={handleSave}
          disabled={!keyInput.trim() || saving}
        >
          {saving ? '⏳ Salvando…' : saved ? '✓ Salva' : '💾 Salvar'}
        </button>
      </div>
      <div className="inline-flex-row" style={{ marginTop: 16 }}>
        <button onClick={onBack}>← Voltar</button>
      </div>
    </div>
  );
}
