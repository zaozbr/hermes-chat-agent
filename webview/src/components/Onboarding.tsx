import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { vscode } from '../utils/vscode';

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

      <ModelPickerSection />

      <section>
        <h3>3. Auto Setup</h3>
        <p className="muted" style={{ fontSize: 11, margin: '0 0 8px' }}>
          Clique abaixo para configurar tudo automaticamente. O processo irá guiar você passo a
          passo.
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
      </section>

      <section>
        <h3>4. Recursos</h3>
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

function ModelPickerSection() {
  const s = useStore();

  useEffect(() => {
    s.getCatalog();
  }, []);

  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');

  useEffect(() => {
    if (s.modelStatus.provider && !provider) setProvider(s.modelStatus.provider);
    if (s.modelStatus.model && !model) setModel(s.modelStatus.model);
  }, [s.modelStatus.provider, s.modelStatus.model]);

  const providerEntry = s.catalog.find((p) => p.id === provider);
  const isCustom = model === '__custom__';
  const canSubmit = provider && (isCustom ? customModel.trim() : model);

  function submit() {
    if (!canSubmit) return;
    s.setModel(provider, isCustom ? '__custom__' : model, customModel.trim());
  }

  return (
    <section>
      <h3>2. Provedor &amp; Modelo</h3>
      {s.modelStatus.configured ? (
        <div className="ok">
          ✓ <strong>{s.modelStatus.provider}</strong> / <code>{s.modelStatus.model}</code>
        </div>
      ) : (
        <div className="warn">⚠ Modelo não configurado. Escolha abaixo:</div>
      )}

      <div className="picker">
        <label>
          Provedor:
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel('');
            }}
          >
            <option value="">— escolha —</option>
            {s.catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.envVars.length > 0 ? ` (precisa ${p.envVars.join(' / ')})` : ''}
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

        {providerEntry && providerEntry.envVars.length > 0 && (
          <p className="muted" style={{ fontSize: 11 }}>
            Este provedor precisa de <code>{providerEntry.envVars.join('</code> ou <code>')}</code>{' '}
            no <code>.env</code> da Hermes. Se não tiver a chave, pegue em{' '}
            <a
              href={`https://${provider === 'nvidia' ? 'build.nvidia.com' : 'console.example.com'}`}
            >
              {provider === 'nvidia' ? 'build.nvidia.com' : 'console do provedor'}
            </a>
            .
          </p>
        )}

        <div className="row">
          <button onClick={submit} disabled={!canSubmit}>
            💾 Salvar no config.yaml
          </button>
          <button onClick={() => s.validateModel()}>🔍 Testar (hermes status)</button>
        </div>

        {s.modelValidation && (
          <div className={s.modelValidation.ok ? 'ok' : 'warn'}>
            {s.modelValidation.ok ? '✓' : '⚠'} {s.modelValidation.detail}
          </div>
        )}
      </div>
    </section>
  );
}
