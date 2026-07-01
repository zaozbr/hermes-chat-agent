export function StepRow({
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
          <pre className="out" style={{ maxHeight: 150, overflow: 'auto', fontSize: 10 }}>
            {log.slice(-4000)}
          </pre>
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
