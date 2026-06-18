import { useStore } from '../state/store';
import { renderMarkdown } from '../utils/markdown';
import { ToolCallCard } from './ToolCallCard';
import { PlanList } from './PlanList';
import type { Message } from '../state/store';

export function ChatMessages() {
  const s = useStore();

  return (
    <main className="chat-main">
      {/* Connection error banner */}
      {!s.status.connected && (
        <div className="banner error">
          <strong>⚠ Hermes não conectado.</strong>
          <p>{s.status.error ?? 'O servidor ACP está offline.'}</p>
        </div>
      )}

      {/* Model validation warning */}
      {s.status.connected && s.modelValidation && !s.modelValidation.ok && s.previousModel && (
        <div className="banner warn">
          <strong>⚠ Modelo inválido: {s.modelValidation.detail}</strong>
          <p>O modelo atual não está funcionando. Você pode voltar ao modelo anterior.</p>
          <div className="banner-actions">
            <button onClick={() => s.revertModel()}>
              ↩ Voltar para {formatModelBadge(s.previousModel.provider, s.previousModel.model)}
            </button>
            <button onClick={() => s.validateModel()}>🔍 Verificar novamente</button>
          </div>
        </div>
      )}

      {/* No model configured warning */}
      {s.status.connected && !(s.status.model && s.status.provider) && (
        <div className="banner warn">
          <strong>⚠ Modelo não configurado.</strong>
          <p>Configure um provedor + modelo nas Configurações (⚙️).</p>
          <div className="banner-actions">
            <button onClick={() => s.validateModel()}>🔍 Verificar agora</button>
          </div>
        </div>
      )}

      {/* Plan list (when cascade mode has active plans) */}
      {s.plan.length > 0 && <PlanList plan={s.plan} />}

      {/* Messages */}
      <div className="messages">
        {s.messages.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🤖</div>
            <p className="empty-title">Diga oi ao Hermes</p>
            <p className="empty-subtitle muted">
              Modo Ask: perguntas e explicações · Modo Edit: alterações no código ·
              Modo Cascade: workflows multi-etapa
            </p>
            {s.status.connected && !s.sessionId && (
              <button onClick={() => s.newSession(s.mode)} className="empty-btn">
                ➕ Iniciar sessão
              </button>
            )}
          </div>
        ) : (
          s.messages.map((m) => <MessageBubble key={m.id} m={m} />)
        )}

        {/* Typing indicator */}
        {s.inProgress && s.messages.at(-1)?.kind === 'user' && (
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── Format helpers ─────────────────────────────────────────────────────── */

function formatModelBadge(provider?: string | null, model?: string | null): string {
  const p = provider || '';
  const m = model || '';
  if (!m) return p || '?';
  if (p && m.startsWith(`${p}/`)) return m;
  if (p) return `${p}/${m}`;
  return m;
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
        <div
          className="bubble muted"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
        />
      </div>
    );
  }
  return (
    <div className={`msg ${m.kind}`}>
      <div className="msg-avatar">
        {m.kind === 'user' ? '👤' : '🤖'}
      </div>
      <div className="msg-content">
        <div className="msg-role">{m.kind === 'user' ? 'Você' : 'Hermes'}</div>
        <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
      </div>
    </div>
  );
}
