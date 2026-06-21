import { useStore, ChatMode } from '../state/store';

function formatModelBadge(provider?: string | null, model?: string | null): string {
  const p = provider || '';
  const m = model || '';
  if (!m) return p || '?';
  if (p && m.startsWith(`${p}/`)) return m;
  if (p) return `${p}/${m}`;
  return m;
}

interface ChatHeaderProps {
  onOpenSettings: () => void;
  onToggleHistory: () => void;
  onOpenModelPicker: () => void;
  onNewSession: () => void;
  onCancel: () => void;
  inProgress: boolean;
}

export function ChatHeader({
  onOpenSettings,
  onToggleHistory,
  onOpenModelPicker,
  onNewSession,
  onCancel,
  inProgress,
}: ChatHeaderProps) {
  const s = useStore();

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <span className={`dot ${s.status.connected ? 'on' : 'off'}`} />
        <strong className="chat-header-title">Hermes</strong>
        {inProgress ? (
          <span className="status-badge active">
            <span className="pulse" />
            <span className="status-text">processando</span>
          </span>
        ) : (
          <span className="status-badge idle">
            <span className="status-icon">⏸</span>
          </span>
        )}
        {s.status.agentVersion && <span className="header-version">v{s.status.agentVersion}</span>}
      </div>

      <div className="chat-header-center">
        <button
          className={`header-model-badge ${!s.status.provider && !s.status.model ? 'no-model' : ''}`}
          onClick={() => onOpenModelPicker()}
          title={
            s.status.provider || s.status.model
              ? 'Clique para trocar modelo'
              : 'Clique para configurar um modelo'
          }
        >
          <span className="model-badge-icon">🧠</span>
          {s.status.provider || s.status.model
            ? formatModelBadge(s.status.provider, s.status.model)
            : 'Configurar modelo'}
        </button>
        <div className="chat-mode-pills">
          {(['ask', 'edit', 'cascade'] as ChatMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-pill ${s.chatMode === mode ? 'active' : ''}`}
              onClick={() => s.setChatMode(mode)}
            >
              {mode === 'ask' && '💬'}
              {mode === 'edit' && '✦'}
              {mode === 'cascade' && '🔗'}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-header-right">
        <button
          className="header-btn"
          onClick={onToggleHistory}
          title="Histórico de sessões"
          aria-label="Histórico"
        >
          🕐
        </button>
        <button
          className="header-btn"
          onClick={onOpenSettings}
          title="Configurações"
          aria-label="Configurações"
        >
          ⚙️
        </button>
        <button
          className="header-btn"
          onClick={onNewSession}
          title="Nova sessão"
          aria-label="Nova sessão"
        >
          ➕
        </button>
        <button
          className="header-btn"
          onClick={onCancel}
          disabled={!inProgress}
          title="Cancelar"
          aria-label="Cancelar"
        >
          ⏹
        </button>
      </div>
    </header>
  );
}
