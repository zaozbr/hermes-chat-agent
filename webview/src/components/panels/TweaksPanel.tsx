import { useStore } from '../../state/store';
import { vscode } from '../../utils/vscode';

export function TweaksPanel({ s }: { s: ReturnType<typeof useStore> }) {
  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>⚡ Tweaks / Performance</h3>
        <p className="muted">Otimizações de performance e configurações avançadas.</p>
      </div>
      <div className="panel-body">
        <div className="config-group">
          <label>Auto-approve</label>
          <p className="muted">
            Quando ativado, o Hermes executa ferramentas sem pedir confirmação.
          </p>
          <button
            className={s.autoApprove ? 'on' : ''}
            onClick={() => vscode.postMessage({ type: 'toggle-auto-approve' })}
          >
            {s.autoApprove ? '✓ Ativado' : '◯ Desativado'}
          </button>
        </div>
        <div className="config-group">
          <label>Cache</label>
          <p className="muted">Cache de respostas e resultados de ferramentas.</p>
          <button onClick={() => vscode.postMessage({ type: 'clear-cache' })}>
            🗑 Limpar cache
          </button>
        </div>
        <div className="config-group">
          <label>Logs</label>
          <p className="muted">Visualizar logs do agente.</p>
          <button onClick={() => vscode.postMessage({ type: 'open-logs' })}>📂 Abrir logs</button>
        </div>
      </div>
    </main>
  );
}
