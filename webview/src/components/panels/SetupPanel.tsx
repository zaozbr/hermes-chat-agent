import { useState, useEffect } from 'react';
import { useStore } from '../../state/store';
import { vscode } from '../../utils/vscode';

export function SetupPanel({ s }: { s: ReturnType<typeof useStore> }) {
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    vscode.postMessage({ type: 'get-config' });
    const unsub = (window as any).__onMessage?.((e: MessageEvent) => {
      const d = e.data;
      if (d.type === 'config-data') {
        setConfigText(d.text ?? '');
        setLoading(false);
      }
    });
    return () => unsub?.();
  }, []);

  function save() {
    vscode.postMessage({ type: 'save-config', text: configText });
  }

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>✦ Setup / Configuração</h3>
        <p className="muted">Configure provedores, modelos e chaves de API.</p>
      </div>
      <div className="panel-body">
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <textarea
              className="config-editor"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
              placeholder="# Configuração do Hermes"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={save}>💾 Salvar</button>
              <button onClick={() => vscode.postMessage({ type: 'open-config-file' })}>
                📂 Abrir no editor
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
