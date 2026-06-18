import { useEffect } from 'react';
import { useStore } from '../state/store';

export function ChatHistorySidebar({
  s,
  onClose,
}: {
  s: ReturnType<typeof useStore>;
  onClose: () => void;
}) {
  useEffect(() => {
    s.loadChatHistory();
  }, []);

  return (
    <div className="sidebar-content">
      <div className="sidebar-header">
        <h3>🕐 Histórico</h3>
        <button className="header-btn" onClick={onClose} title="Fechar">
          ✕
        </button>
      </div>
      <div className="sidebar-body">
        {s.chatHistory.length === 0 ? (
          <p className="muted">Nenhuma sessão anterior.</p>
        ) : (
          s.chatHistory.map((session) => (
            <div
              key={session.id}
              className="history-item"
              onClick={() => s.switchSession(session.id)}
            >
              <div className="history-item-title">{session.title || 'Sessão sem título'}</div>
              <div className="history-item-meta muted">
                {session.messageCount} msgs · {session.timestamp}
              </div>
              {session.preview && (
                <div className="history-item-preview muted">{session.preview}</div>
              )}
              <button
                className="history-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  s.deleteSession(session.id);
                }}
                title="Deletar sessão"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
