import { useStore } from '../state/store';
import { ToolCallCard } from './ToolCallCard';
import { PlanList } from './PlanList';
import { PermissionDialog } from './PermissionDialog';
import { renderMarkdown } from '../utils/markdown';
import type { Message } from '../state/store';
import { useEffect, useRef } from 'react';

function formatModelBadge(provider?: string | null, model?: string | null): string {
  const p = provider || '';
  const m = model || '';
  if (!m) return p || '?';
  if (p && m.startsWith(`${p}/`)) return m;
  if (p) return `${p}/${m}`;
  return m;
}

export function CascadeFlow() {
  const s = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [s.messages.length]);

  return (
    <div className="cascade">
      <header className="cascade-header">
        <span className={`dot ${s.status.connected ? 'on' : 'off'}`} />
        <strong>🌀 Cascade Flow</strong>
        {s.status.model && (
          <span className="sid" title="model">{formatModelBadge(s.status.provider, s.status.model)}</span>
        )}
        {s.sessionId && <code className="sid">{s.sessionId.slice(0, 16)}</code>}
        <span className="grow" />
        <button onClick={() => s.newSession('code')}>+ New</button>
        <button onClick={() => s.cancel()} disabled={!s.inProgress}>Stop</button>
      </header>

      <div className="cascade-body" ref={scrollRef}>
        {!s.status.connected && (
          <div className="banner error">⚠ Hermes não conectado.</div>
        )}

        {s.status.connected && !(s.status.model && s.status.provider) && (
          <div className="banner warn" style={{ marginBottom: 8 }}>
            ⚠ Modelo não configurado — abra o <strong>Setup</strong> e escolha provedor + modelo.
          </div>
        )}

        {s.plan.length > 0 && (
          <section className="panel plan-panel">
            <PlanList plan={s.plan} />
          </section>
        )}

        <section className="panel messages-panel">
          {s.messages.map((m) => (
            <CascadeMessage key={m.id} m={m} />
          ))}
          {s.inProgress && (
            <div className="typing">
              <span />·<span />·<span />
            </div>
          )}
        </section>
      </div>

      <InputBar />

      {s.permissionRequest && <PermissionDialog req={s.permissionRequest} />}
    </div>
  );
}

function CascadeMessage({ m }: { m: Message }) {
  if (m.kind === 'tool') return <ToolCallCard m={m} />;
  if (m.kind === 'thought') {
    return (
      <details className="bubble thought" open={false}>
        <summary>💭 thinking</summary>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
      </details>
    );
  }
  return (
    <article className={`bubble ${m.kind}`}>
      <header>{m.kind === 'user' ? 'You' : 'Hermes'}</header>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
    </article>
  );
}

function InputBar() {
  const s = useStore();
  return (
    <footer className="cascade-input">
      <textarea
        rows={2}
        className="input"
        placeholder="Descreva a tarefa em linguagem natural. Enter envia, Shift+Enter quebra linha."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const v = (e.currentTarget.value || '').trim();
            if (!v) return;
            s.send(v);
            e.currentTarget.value = '';
          }
        }}
        disabled={!s.status.connected}
      />
    </footer>
  );
}
