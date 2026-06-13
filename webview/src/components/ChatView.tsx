import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../state/store';
import { renderMarkdown } from '../utils/markdown';
import type { Message, McpInfo } from '../state/store';
import { ToolCallCard } from './ToolCallCard';
import { PlanList } from './PlanList';
import { PermissionDialog } from './PermissionDialog';
import { vscode } from '../utils/vscode';

type TabId = 'chat' | 'setup' | 'cascade' | 'config' | 'mcp' | 'tweaks';

const TABS: Array<{ id: TabId; icon: string; label: string }> = [
  { id: 'chat',   icon: '💬', label: 'Chat' },
  { id: 'setup',  icon: '✦',  label: 'Setup' },
  { id: 'cascade', icon: '🔗', label: 'Cascade' },
  { id: 'config', icon: '⚙',  label: 'Configurações' },
  { id: 'mcp',    icon: '🔌', label: 'MCP' },
  { id: 'tweaks', icon: '⚡', label: 'Tweaks' },
];

function formatModelBadge(provider?: string | null, model?: string | null): string {
  const p = provider || '';
  const m = model || '';
  if (!m) return p || '?';
  if (p && m.startsWith(`${p}/`)) return m;
  if (p) return `${p}/${m}`;
  return m;
}

export function ChatView() {
  const s = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        setActiveTab(TABS[+e.key - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="chat-view">
      <header className="chat-header">
        <div className="chat-title">
          <span className={`dot ${s.status.connected ? 'on' : 'off'}`} />
          <strong>Hermes</strong>
          {s.inProgress ? (
            <span className="status-badge active">
              <span className="pulse" />
              <span className="status-text">processando</span>
            </span>
          ) : (
            <span className="status-badge idle">
              <span className="status-icon">⏸</span>
            </span>
          )}
          {s.status.agentVersion && <span className="ver">v{s.status.agentVersion}</span>}
          {(s.status.provider || s.status.model) && (
            <span className="ver" title="model configured">
              · {formatModelBadge(s.status.provider, s.status.model)}
            </span>
          )}
        </div>
        <div className="chat-actions">
          <button onClick={() => s.newSession(s.mode)} title="Nova sessão">➕</button>
          <button onClick={() => s.cancel()} title="Cancelar" disabled={!s.inProgress}>⏹</button>
        </div>
      </header>

      <nav className="agent-tabs" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`agent-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            title={`${t.label} (Ctrl+${i + 1})`}
          >
            <span className="tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {s.status.usage && (
        <div className="usage-bar" title={`${s.status.usage.used} / ${s.status.usage.size} tokens`}>
          <div
            className="usage-fill"
            style={{ width: `${Math.min(100, (s.status.usage.used / s.status.usage.size) * 100)}%` }}
          />
        </div>
      )}

      {activeTab === 'chat' && <ChatPanel s={s} />}
      {activeTab !== 'chat' && <PanelWrapper>{getPanel(activeTab, s)}</PanelWrapper>}
      {activeTab === 'chat' && <InputBox s={s} />}

      {s.error && (
        <div className="banner error sticky" onClick={() => s.clearError()}>
          ❌ {s.error} <small>(clique para fechar)</small>
        </div>
      )}
      {s.permissionRequest && <PermissionDialog req={s.permissionRequest} />}
    </div>
  );
}

/* ─── Chat Panel ─────────────────────────────────────────────────────────── */

function ChatPanel({ s }: { s: ReturnType<typeof useStore> }) {
  return (
    <main className="chat-main">
      {!s.status.connected && (
        <div className="banner error">
          <strong>⚠ Hermes não conectado.</strong>
          <p>{s.status.error ?? 'O servidor ACP está offline.'}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => vscode.postMessage({ type: 'retry-connect' })}>🔌 Conectar</button>
            <button onClick={() => vscode.postMessage({ type: 'open-onboarding' })}>✦ Assistente de Setup</button>
          </div>
        </div>
      )}

      {s.status.connected && s.modelValidation && !s.modelValidation.ok && s.previousModel && (
        <div className="banner warn" style={{ margin: '0 10px 8px' }}>
          <strong>⚠ Modelo inválido: {s.modelValidation.detail}</strong>
          <p style={{ margin: '4px 0 0' }}>
            O modelo atual não está funcionando. Você pode voltar ao modelo anterior.
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => s.revertModel()}>↩ Voltar para {formatModelBadge(s.previousModel.provider, s.previousModel.model)}</button>
            <button onClick={() => s.validateModel()}>🔍 Verificar novamente</button>
          </div>
        </div>
      )}

      {s.status.connected && !(s.status.model && s.status.provider) && (
        <div className="banner warn" style={{ margin: '0 10px 8px' }}>
          <strong>⚠ Modelo não configurado.</strong>
          <p style={{ margin: '4px 0 0' }}>
            Configure um provedor + modelo no Setup.
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => vscode.postMessage({ type: 'open-onboarding' })}>✦ Abrir Setup</button>
            <button onClick={() => s.validateModel()}>🔍 Verificar agora</button>
          </div>
          {s.modelValidation && (
            <p className="muted" style={{ marginTop: 4, fontSize: 11 }}>
              {s.modelValidation.ok ? '✓' : '⚠'} {s.modelValidation.detail}
            </p>
          )}
        </div>
      )}

      {s.plan.length > 0 && <PlanList plan={s.plan} />}

      <div className="messages">
        {s.messages.length === 0 && (
          <div className="empty">
            <p>👋 Diga oi ao Hermes.</p>
            <p className="muted">Modo Edit: alterações no repo. Modo Ask: perguntas e explicações.</p>
            {s.status.connected && !s.sessionId && (
              <button onClick={() => s.newSession(s.mode)} style={{ marginTop: 12 }}>➕ Iniciar sessão</button>
            )}
          </div>
        )}
        {s.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {s.inProgress && s.messages.at(-1)?.kind === 'user' && (
          <div className="typing"><span /><span /><span /></div>
        )}
      </div>
    </main>
  );
}

/* ─── Panel Wrapper ──────────────────────────────────────────────────────── */

function PanelWrapper({ children }: { children: React.ReactNode }) {
  return <main className="chat-main">{children}</main>;
}

function getPanel(tab: TabId, s: ReturnType<typeof useStore>) {
  switch (tab) {
    case 'setup': return <SetupPanel s={s} />;
    case 'cascade': return <CascadePanel s={s} />;
    case 'config': return <ConfigPanel s={s} />;
    case 'mcp': return <McpPanel s={s} />;
    case 'tweaks': return <TweaksPanel s={s} />;
    default: return null;
  }
}

/* ─── Message Bubble ─────────────────────────────────────────────────────── */

function MessageBubble({ m }: { m: Message }) {
  if (m.kind === 'tool') return <ToolCallCard m={m} />;
  if (m.kind === 'thought') {
    return (
      <details className="msg thought" open>
        <summary>💭 thinking</summary>
        <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
      </details>
    );
  }
  if (m.kind === 'system') {
    return (
      <div className="msg system">
        <div className="bubble muted" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
      </div>
    );
  }
  return (
    <div className={`msg ${m.kind}`}>
      <div className="role">{m.kind === 'user' ? 'Você' : 'Hermes'}</div>
      <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
    </div>
  );
}

/* ─── Input Box ──────────────────────────────────────────────────────────── */

function InputBox({ s }: { s: ReturnType<typeof useStore> }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const placeholder = !s.status.connected
    ? 'Conecte o Hermes primeiro…'
    : s.inProgress
    ? 'Hermes está trabalhando… (Esc para cancelar)'
    : 'Pergunte algo ao Hermes…   (Enter envia · Shift+Enter nova linha)';

  useEffect(() => {
    s.loadAgents();
    s.getCatalog();
  }, []);

  function send() {
    const v = value.trim();
    if (!v) return;
    s.send(v);
    setValue('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    } else if (e.key === 'Escape' && s.inProgress) {
      e.preventDefault();
      s.cancel();
    }
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const names = Array.from(files).map(f => f.name);
    const mention = names.map(n => `@file ${n}`).join(' ');
    setValue(prev => prev ? `${prev} ${mention}` : mention);
    e.target.value = '';
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    el.style.height = Math.min(lineHeight * 8 + 16, el.scrollHeight) + 'px';
  }, [value]);

  const currentAgent = s.agents.find(a => a.name === s.currentAgent) ?? s.agents[0];

  return (
    <footer className="chat-input">
      <div className="input-mode-row">
        <div className="mode-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={s.mode === 'code'}
            className={`mode-tab ${s.mode === 'code' ? 'active' : ''}`}
            onClick={() => s.setMode('code')}
            title="Modo Edit: aplica mudanças no repositório">
            <span className="mode-icon">✦</span> Edit
          </button>
          <button type="button" role="tab" aria-selected={s.mode === 'chat'}
            className={`mode-tab ${s.mode === 'chat' ? 'active' : ''}`}
            onClick={() => s.setMode('chat')}
            title="Modo Ask: perguntas e explicações">
            <span className="mode-icon">💬</span> Ask
          </button>
          <span className="grow" />
          <button type="button" className="tool-btn" onClick={() => s.loadSkills()} title="Skills">
            Skills
          </button>
          <button type="button" className="tool-btn" onClick={() => s.loadMcp()} title="MCP">
            MCP
          </button>
        </div>
      </div>

      <div className="input-row">
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo (📎)"
          aria-label="Anexar arquivo">
          📎
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={onFiles} />
        <textarea
          ref={textareaRef}
          className="input"
          value={value}
          placeholder={placeholder}
          rows={2}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="send-btn" onClick={send}
          disabled={!value.trim()} title="Enviar (Enter)" aria-label="Enviar">
          {s.inProgress ? '⏹' : '➤'}
        </button>
      </div>

      <div className="input-selectors">
        <div className="selector-group">
          <label className="selector-label">Agente:</label>
          <div className="agent-selector">
            {s.agents.map(a => (
              <button
                key={a.name}
                type="button"
                className={`agent-chip ${a.name === s.currentAgent ? 'active' : ''}`}
                onClick={() => s.switchAgent(a.name)}
                title={a.description}
                style={{ '--chip-color': a.color } as React.CSSProperties}>
                <span className="chip-dot" />
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <label className="selector-label">Modelo:</label>
          <button
            type="button"
            className={`model-selector-btn ${s.modelValidation && !s.modelValidation.ok ? 'invalid' : ''}`}
            onClick={() => setShowModelPicker(!showModelPicker)}
            title="Trocar modelo">
            {formatModelBadge(s.status.provider, s.status.model)}
            {s.modelValidation && !s.modelValidation.ok && <span className="model-warn">⚠</span>}
            <span className="chevron">{showModelPicker ? '▲' : '▼'}</span>
          </button>
          {s.previousModel && s.modelValidation && !s.modelValidation.ok && (
            <button
              type="button"
              className="revert-btn"
              onClick={() => s.revertModel()}
              title="Voltar ao modelo anterior">
              ↩ Voltar
            </button>
          )}
        </div>
      </div>

      {showModelPicker && (
        <ModelPicker s={s} onSelect={(p, m) => { s.setModel(p, m); setShowModelPicker(false); }} />
      )}

      <div className="input-status">
        <span className="muted">{s.status.connected ? '🟢 Conectado' : '🔴 Desconectado'}</span>
        {s.sessionId && <span className="muted">· sessão {s.sessionId.slice(0, 8)}</span>}
        {s.status.usage && (
          <span className="muted">
            · {(s.status.usage.used / 1000).toFixed(1)}k / {(s.status.usage.size / 1000).toFixed(0)}k tokens
          </span>
        )}
        {s.inProgress && (
          <button className="link-btn" onClick={() => s.cancel()}>· Cancelar</button>
        )}
        <span className="grow" />
        <button
          className={`link-btn ${s.autoApprove ? 'on' : ''}`}
          onClick={() => vscode.postMessage({ type: 'toggle-auto-approve' })}
          title={s.autoApprove ? 'Auto-approve: ON' : 'Auto-approve: OFF'}>
          {s.autoApprove ? '✓ auto-approve' : '◯ auto-approve'}
        </button>
      </div>
    </footer>
  );
}

/* ─── Model Picker Dropdown ──────────────────────────────────────────────── */

function ModelPicker({ s, onSelect }: { s: ReturnType<typeof useStore>; onSelect: (provider: string, model: string) => void }) {
  const [filter, setFilter] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [validating, setValidating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    s.status.provider || (s.catalog.length > 0 ? s.catalog[0].id : '')
  );
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync selected provider when catalog changes (e.g., after storing a new API key)
  useEffect(() => {
    if (s.catalog.length > 0 && !s.catalog.find(p => p.id === selectedProvider)) {
      setSelectedProvider(s.catalog[0].id);
    }
  }, [s.catalog, selectedProvider]);

  // Fetch models from provider API when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    // Check if we already have models cached
    if (s.providerModels[selectedProvider]?.length > 0) return;
    setLoading(true);
    vscode.postMessage({ type: 'fetch-provider-models', provider: selectedProvider });
  }, [selectedProvider, s.providerModels]);

  // Stop loading when models arrive
  useEffect(() => {
    if (s.providerModels[selectedProvider]?.length > 0 || s.providerModelsError[selectedProvider]) {
      setLoading(false);
    }
  }, [s.providerModels, s.providerModelsError, selectedProvider]);

  // Use fetched models if available, fall back to catalog
  const fetchedModels = s.providerModels[selectedProvider] ?? [];
  const catalogEntry = s.catalog.find(p => p.id === selectedProvider);
  const catalogModels = catalogEntry?.models ?? [];
  const allModels = fetchedModels.length > 0 ? fetchedModels : catalogModels;

  const filteredModels = allModels
    .filter(m => !filter || m.label.toLowerCase().includes(filter.toLowerCase()) || m.id.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  const fetchError = s.providerModelsError[selectedProvider];

  function handleSelect(provider: string, model: string) {
    setValidating(true);
    onSelect(provider, model);
  }

  return (
    <div className="model-picker">
      {validating && (
        <div className="model-validating">
          <span className="spinner" /> Validando modelo…
        </div>
      )}
      <div className="model-picker-header">
        <select
          className="provider-select"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}>
          {s.catalog.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="text"
          className="model-picker-search"
          placeholder="Filtrar modelos…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="model-picker-list">
        {loading && (
          <div className="muted" style={{ padding: '12px 8px', textAlign: 'center' }}>
            <span className="spinner" /> Buscando modelos do provider…
          </div>
        )}
        {fetchError && fetchError === 'nvidia-permission' && (
          <div className="muted" style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.5 }}>
            <div style={{ color: '#f90', marginBottom: 4 }}>⚠ Não foi possível listar modelos da API</div>
            <div style={{ opacity: 0.8 }}>
              Sua conta NVIDIA pode estar sem a permissão <b>Public API Endpoints</b>.
              <br />Solicite no fórum:
              <br />
              <a href="https://forums.developer.nvidia.com/c/ai-data-science/nvidia-nim/access-accounts/699"
                 target="_blank" rel="noopener"
                 style={{ color: '#8ab4f8' }}>
                forums.developer.nvidia.com/.../access-accounts
              </a>
            </div>
            <div style={{ opacity: 0.6, marginTop: 4, fontSize: '0.9em' }}>Usando catálogo estático como fallback</div>
          </div>
        )}
        {fetchError && fetchError !== 'nvidia-permission' && (
          <div className="muted" style={{ padding: '12px 8px', textAlign: 'center', color: '#f44' }}>
            Erro: {fetchError}
          </div>
        )}
        {!loading && !fetchError && catalogEntry && (
          <div key={catalogEntry.id} className="model-provider">
            <div className="provider-name">
              {catalogEntry.label}
              {fetchedModels.length > 0 && <span style={{opacity:0.5, fontSize:'0.85em'}}> ({fetchedModels.length} modelos da API)</span>}
            </div>
            {filteredModels.map(m => (
              <button
                key={m.id}
                type="button"
                className={`model-option ${s.status.provider === catalogEntry.id && s.status.model === m.id ? 'current' : ''}`}
                onClick={() => handleSelect(catalogEntry.id, m.id)}
                title={(m as any).notes ?? m.label}>
                <span className="model-label">{m.label}</span>
                {s.status.provider === catalogEntry.id && s.status.model === m.id && <span className="model-current">●</span>}
                {(m as any).ctx && <span className="model-ctx">{(m as any).ctx}</span>}
                {(m as any).free && <span className="model-free">grátis</span>}
              </button>
            ))}
          </div>
        )}
        {!loading && filteredModels.length === 0 && (
          <div className="muted" style={{ padding: '12px 8px', textAlign: 'center' }}>
            Nenhum modelo encontrado
          </div>
        )}
      </div>
      <div className="model-picker-footer">
        <input
          type="text"
          className="model-custom-input"
          placeholder="ou digite o ID do modelo…"
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customModel.trim()) {
              handleSelect(selectedProvider, customModel.trim());
            }
          }}
        />
        {customModel.trim() && (
          <button type="button" className="model-custom-btn" onClick={() => handleSelect(selectedProvider, customModel.trim())}>
            Usar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Setup Panel ────────────────────────────────────────────────────────── */

function SetupPanel({ s }: { s: ReturnType<typeof useStore> }) {
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

/* ─── Cascade Panel ──────────────────────────────────────────────────────── */

function CascadePanel({ s }: { s: ReturnType<typeof useStore> }) {
  const [cascades, setCascades] = useState<Array<{ name: string; active: boolean; skills: string[] }>>([]);

  useEffect(() => {
    vscode.postMessage({ type: 'load-cascades' });
  }, []);

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>🔗 Cascade</h3>
        <p className="muted">Gerencie cascatas de ferramentas e workflows.</p>
      </div>
      <div className="panel-body">
        {cascades.length === 0 ? (
          <p className="muted">Nenhuma cascade configurada. Use o Assistente de Setup para criar.</p>
        ) : (
          cascades.map(c => (
            <div key={c.name} className="list-item">
              <span className={`dot ${c.active ? 'on' : 'off'}`} />
              <strong>{c.name}</strong>
              <span className="muted">· {c.skills.length} skills</span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

/* ─── Config Panel ───────────────────────────────────────────────────────── */

function ConfigPanel({ s }: { s: ReturnType<typeof useStore> }) {
  const [apiKeys, setApiKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [ keyValue, setKeyValue ] = useState('');
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

  // Listen for responses
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
    vscode.postMessage({ type: 'save-api-key', provider: editingProvider, apiKey: keyValue.trim() });
  }

  function deleteKey(provider: string) {
    vscode.postMessage({ type: 'delete-api-key', provider });
  }

  function saveBaseUrl() {
    if (!editingUrlProvider || !urlValue.trim()) return;
    vscode.postMessage({ type: 'save-base-url', provider: editingUrlProvider, baseUrl: urlValue.trim() });
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
          <p className="muted" style={{ fontSize: 11 }}>Armazenadas de forma segura no VS Code. Reaplicadas automaticamente ao trocar de provedor.</p>
          <div className="api-keys-list">
            {providers.map(p => (
              <div key={p.id} className="api-key-row">
                <div className="api-key-info">
                  <span className={`dot ${apiKeys[p.id] ? 'on' : 'off'}`} />
                  <span className="api-key-label">{p.label}</span>
                  <span className="muted" style={{ fontSize: 10 }}>{p.envVar}</span>
                </div>
                <div className="api-key-actions">
                  {showSaved === p.id && (
                    <span className="saved-indicator">✓ Salvo</span>
                  )}
                  {editingProvider === p.id ? (
                    <>
                      <input
                        type="password"
                        className="api-key-input"
                        placeholder="Cole a API key…"
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
                        autoFocus
                      />
                      <button className="save-btn" onClick={saveKey} disabled={!keyValue.trim()}>Salvar</button>
                      <button className="cancel-btn" onClick={() => { setEditingProvider(null); setKeyValue(''); }}>✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingProvider(p.id); setKeyValue(''); }}>
                        {apiKeys[p.id] ? '🔄 Atualizar' : '+ Adicionar'}
                      </button>
                      {apiKeys[p.id] && (
                        <button className="delete-btn" onClick={() => deleteKey(p.id)}>🗑</button>
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
          <p className="muted" style={{ fontSize: 11 }}>Endpoint da API para cada provedor. Alterado automaticamente ao trocar de modelo.</p>
          <div className="api-keys-list">
            {providers.map(p => (
              <div key={p.id} className="api-key-row">
                <div className="api-key-info">
                  <span className={`dot ${storedUrls[p.id] ? 'on' : 'off'}`} />
                  <span className="api-key-label">{p.label}</span>
                  <span className="muted" style={{ fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{baseUrls[p.id]}</span>
                </div>
                <div className="api-key-actions">
                  {showUrlSaved === p.id && (
                    <span className="saved-indicator">✓ Salvo</span>
                  )}
                  {editingUrlProvider === p.id ? (
                    <>
                      <input
                        type="text"
                        className="api-key-input"
                        placeholder="https://api.example.com/v1"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveBaseUrl(); }}
                        autoFocus
                      />
                      <button className="save-btn" onClick={saveBaseUrl} disabled={!urlValue.trim()}>Salvar</button>
                      <button className="cancel-btn" onClick={() => { setEditingUrlProvider(null); setUrlValue(''); }}>✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingUrlProvider(p.id); setUrlValue(baseUrls[p.id] || ''); }}>
                        {storedUrls[p.id] ? '🔄 Editar' : '✏ Definir'}
                      </button>
                      {storedUrls[p.id] && (
                        <button className="delete-btn" onClick={() => deleteBaseUrl(p.id)}>🗑</button>
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

/* ─── MCP Panel ──────────────────────────────────────────────────────────── */

function McpPanel({ s }: { s: ReturnType<typeof useStore> }) {
  useEffect(() => {
    s.loadMcp();
  }, []);

  const servers = s.mcp || [];

  function toggle(name: string, enabled: boolean) {
    s.toggleMcp(name, enabled);
  }

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>🔌 Servidores MCP</h3>
        <p className="muted">Model Context Protocol — servidores de ferramentas externos.</p>
      </div>
      <div className="panel-body">
        {servers.length === 0 ? (
          <p className="muted">Nenhum servidor MCP encontrado.</p>
        ) : (
          servers.map((srv: McpInfo) => (
            <div key={srv.name} className="list-item mcp-item">
              <div className="mcp-info">
                <span className={`dot ${srv.enabled ? 'on' : 'off'}`} />
                <strong>{srv.name}</strong>
                <span className="muted">· {srv.transport}</span>
              </div>
              <button
                className={`toggle-btn ${srv.enabled ? 'on' : ''}`}
                onClick={() => toggle(srv.name, !srv.enabled)}
                title={srv.enabled ? 'Desativar' : 'Ativar'}>
                {srv.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))
        )}
        <button onClick={() => s.loadMcp()} style={{ marginTop: 8 }}>🔄 Recarregar</button>
      </div>
    </main>
  );
}

/* ─── Tweaks Panel ───────────────────────────────────────────────────────── */

function TweaksPanel({ s }: { s: ReturnType<typeof useStore> }) {
  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>⚡ Tweaks / Performance</h3>
        <p className="muted">Otimizações de performance e configurações avançadas.</p>
      </div>
      <div className="panel-body">
        <div className="config-group">
          <label>Auto-approve</label>
          <p className="muted">Quando ativado, o Hermes executa ferramentas sem pedir confirmação.</p>
          <button
            className={s.autoApprove ? 'on' : ''}
            onClick={() => vscode.postMessage({ type: 'toggle-auto-approve' })}>
            {s.autoApprove ? '✓ Ativado' : '◯ Desativado'}
          </button>
        </div>
        <div className="config-group">
          <label>Cache</label>
          <p className="muted">Cache de respostas e resultados de ferramentas.</p>
          <button onClick={() => vscode.postMessage({ type: 'clear-cache' })}>🗑 Limpar cache</button>
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
