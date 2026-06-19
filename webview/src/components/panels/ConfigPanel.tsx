import { useState, useEffect } from 'react';
import { useStore } from '../../state/store';
import { vscode } from '../../utils/vscode';
import { formatModelBadge } from '../../utils/formatModelBadge';

export function ConfigPanel({ s }: { s: ReturnType<typeof useStore> }) {
  const [apiKeys, setApiKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [showSaved, setShowSaved] = useState<string | null>(null);
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [storedUrls, setStoredUrls] = useState<Record<string, string>>({});
  const [editingUrlProvider, setEditingUrlProvider] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [showUrlSaved, setShowUrlSaved] = useState<string | null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'list-api-keys' });
    vscode.postMessage({ type: 'list-base-urls' });
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'api-keys-list') {
        setApiKeys(e.data.statuses ?? {});
      }
      if (e.data?.type === 'api-key-saved') {
        setShowSaved(e.data.provider);
        setEditingProvider(null);
        setKeyValue('');
        setTimeout(() => setShowSaved(null), 2000);
        vscode.postMessage({ type: 'list-api-keys' });
      }
      if (e.data?.type === 'api-key-deleted') {
        setEditingProvider(null);
        setKeyValue('');
        vscode.postMessage({ type: 'list-api-keys' });
      }
      if (e.data?.type === 'base-urls-list') {
        setBaseUrls(e.data.urls ?? {});
        setStoredUrls(e.data.stored ?? {});
      }
      if (e.data?.type === 'base-url-saved') {
        setShowUrlSaved(e.data.provider);
        setEditingUrlProvider(null);
        setUrlValue('');
        setTimeout(() => setShowUrlSaved(null), 2000);
        vscode.postMessage({ type: 'list-base-urls' });
      }
      if (e.data?.type === 'base-url-deleted') {
        setEditingUrlProvider(null);
        setUrlValue('');
        vscode.postMessage({ type: 'list-base-urls' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const providers = [
    { id: 'nvidia', label: 'NVIDIA NIM', envVar: 'NVIDIA_API_KEY' },
    { id: 'openrouter', label: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
    { id: 'openai', label: 'OpenAI', envVar: 'OPENAI_API_KEY' },
    { id: 'anthropic', label: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
    { id: 'groq', label: 'Groq', envVar: 'GROQ_API_KEY' },
    { id: 'together', label: 'Together AI', envVar: 'TOGETHER_API_KEY' },
    { id: 'mistral', label: 'Mistral', envVar: 'MISTRAL_API_KEY' },
    { id: 'deepseek', label: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY' },
  ];

  function saveKey() {
    if (!editingProvider || !keyValue.trim()) return;
    vscode.postMessage({
      type: 'save-api-key',
      provider: editingProvider,
      apiKey: keyValue.trim(),
    });
  }

  function deleteKey(provider: string) {
    vscode.postMessage({ type: 'delete-api-key', provider });
  }

  function saveBaseUrl() {
    if (!editingUrlProvider || !urlValue.trim()) return;
    vscode.postMessage({
      type: 'save-base-url',
      provider: editingUrlProvider,
      baseUrl: urlValue.trim(),
    });
  }

  function deleteBaseUrl(provider: string) {
    vscode.postMessage({ type: 'delete-base-url', provider });
  }

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>⚙ Configurações</h3>
        <p className="muted">Chaves de API e ajustes do Hermes.</p>
      </div>
      <div className="panel-body">
        <div className="config-group">
          <label>Modelo atual</label>
          <div className="muted">{formatModelBadge(s.status.provider, s.status.model)}</div>
        </div>
        <div className="config-group">
          <label>Sessão</label>
          <div className="muted">{s.sessionId || 'Nenhuma sessão ativa'}</div>
        </div>
        <div className="config-group">
          <label>Modo</label>
          <div className="muted">{s.mode === 'code' ? 'Edit (alterações)' : 'Ask (perguntas)'}</div>
        </div>

        <div className="config-group">
          <label>Chaves de API por Provedor</label>
          <p className="small-muted">
            Armazenadas de forma segura no VS Code. Reaplicadas automaticamente ao trocar de
            provedor.
          </p>
          <div className="api-keys-list">
            {providers.map((p) => (
              <div key={p.id} className="api-key-row">
                <div className="api-key-info">
                  <span className={`dot ${apiKeys[p.id] ? 'on' : 'off'}`} />
                  <span className="api-key-label">{p.label}</span>
                  <span className="xsmall-muted">{p.envVar}</span>
                </div>
                <div className="api-key-actions">
                  {showSaved === p.id && <span className="saved-indicator">✓ Salvo</span>}
                  {editingProvider === p.id ? (
                    <>
                      <input
                        type="password"
                        className="api-key-input"
                        placeholder="Cole a API key…"
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveKey();
                        }}
                        autoFocus
                      />
                      <button className="save-btn" onClick={saveKey} disabled={!keyValue.trim()}>
                        Salvar
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setEditingProvider(null);
                          setKeyValue('');
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingProvider(p.id);
                          setKeyValue('');
                        }}
                      >
                        {apiKeys[p.id] ? '🔄 Atualizar' : '+ Adicionar'}
                      </button>
                      {apiKeys[p.id] && (
                        <button className="delete-btn" onClick={() => deleteKey(p.id)}>
                          🗑
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="config-group">
          <label>URL Base por Provedor</label>
          <p className="small-muted">
            Endpoint da API para cada provedor. Alterado automaticamente ao trocar de modelo.
          </p>
          <div className="api-keys-list">
            {providers.map((p) => (
              <div key={p.id} className="api-key-row">
                <div className="api-key-info">
                  <span className={`dot ${storedUrls[p.id] ? 'on' : 'off'}`} />
                  <span className="api-key-label">{p.label}</span>
                  <span className="url-text">{baseUrls[p.id]}</span>
                </div>
                <div className="api-key-actions">
                  {showUrlSaved === p.id && <span className="saved-indicator">✓ Salvo</span>}
                  {editingUrlProvider === p.id ? (
                    <>
                      <input
                        type="text"
                        className="api-key-input"
                        placeholder="https://api.example.com/v1"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveBaseUrl();
                        }}
                        autoFocus
                      />
                      <button
                        className="save-btn"
                        onClick={saveBaseUrl}
                        disabled={!urlValue.trim()}
                      >
                        Salvar
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setEditingUrlProvider(null);
                          setUrlValue('');
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingUrlProvider(p.id);
                          setUrlValue(baseUrls[p.id] || '');
                        }}
                      >
                        {storedUrls[p.id] ? '🔄 Editar' : '✏ Definir'}
                      </button>
                      {storedUrls[p.id] && (
                        <button className="delete-btn" onClick={() => deleteBaseUrl(p.id)}>
                          🗑
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
