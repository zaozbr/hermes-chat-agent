import { useState, useRef, useEffect } from 'react';
import { useStore } from '../state/store';
import { vscode } from '../utils/vscode';

/** Subcomponent to apply dynamic mention color via ref (avoids inline style diagnostic). */
function MentionItem({
  name,
  color,
  description,
  onSelect,
}: {
  name: string;
  color: string;
  description: string;
  onSelect: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (btnRef.current) {
      btnRef.current.style.setProperty('--mention-color', color);
    }
  }, [color]);
  return (
    <button ref={btnRef} type="button" className="mention-item" onClick={onSelect}>
      <span className="mention-dot" />
      <span className="mention-name">{name}</span>
      <span className="mention-desc muted">{description}</span>
    </button>
  );
}

export function ChatInput() {
  const s = useStore();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  useEffect(() => {
    s.loadAgents();
    s.getCatalog();
  }, []);

  /** Envia mensagem */
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
    } else if (e.key === 'Escape') {
      if (showAgentMenu) {
        setShowAgentMenu(false);
        return;
      }
      if (s.inProgress) {
        e.preventDefault();
        s.cancel();
      }
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    setValue(newVal);

    // Detect @-mention trigger
    const cursorPos = e.target.selectionStart ?? newVal.length;
    const textBefore = newVal.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setShowAgentMenu(true);
      setMentionFilter(atMatch[1].toLowerCase());
    } else {
      setShowAgentMenu(false);
    }
  }

  function selectAgent(name: string) {
    // Replace the @mention text with the agent name
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      const before = textBefore.slice(0, textBefore.length - atMatch[0].length);
      const newVal = `${before}@${name} ${textAfter}`;
      setValue(newVal);
    }
    setShowAgentMenu(false);
    textareaRef.current?.focus();
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const names = Array.from(files).map((f) => f.name);
    const mention = names.map((n) => `@file ${n}`).join(' ');
    setValue((prev) => (prev ? `${prev} ${mention}` : mention));
    e.target.value = '';
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    el.style.height = Math.min(lineHeight * 8 + 16, el.scrollHeight) + 'px';
  }, [value]);

  const filteredAgents = s.agents.filter((a) => a.name.toLowerCase().includes(mentionFilter));

  const placeholder = !s.status.connected
    ? 'Conecte o Hermes primeiro…'
    : s.inProgress
      ? 'Hermes está trabalhando… (Esc para cancelar)'
      : 'Pergunte algo ao Hermes… (@ para agente, Enter envia)';

  return (
    <footer className="chat-input">
      <div className="input-row">
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo (📎)"
          aria-label="Anexar arquivo"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="file-input-hidden"
          onChange={onFiles}
          aria-label="Anexar arquivo ao chat"
        />

        <div className="input-textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="input"
            value={value}
            placeholder={placeholder}
            rows={1}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
          />

          {/* @-mention dropdown */}
          {showAgentMenu && filteredAgents.length > 0 && (
            <div className="mention-menu">
              {filteredAgents.map((a) => (
                <MentionItem
                  key={a.name}
                  name={a.name}
                  color={a.color}
                  description={a.description}
                  onSelect={() => selectAgent(a.name)}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="send-btn"
          onClick={send}
          disabled={!value.trim() || !s.status.connected}
          title="Enviar (Enter)"
          aria-label="Enviar"
        >
          {s.inProgress ? '⏹' : '➤'}
        </button>
      </div>

      {/* Status bar compacta */}
      <div className="input-status">
        <span className={`status-dot ${s.status.connected ? 'connected' : 'disconnected'}`} />
        <span className="status-label">{s.status.connected ? 'Conectado' : 'Desconectado'}</span>
        {s.sessionId && <span className="status-session">· sessão {s.sessionId.slice(0, 8)}</span>}
        {s.status.usage && (
          <span className="status-tokens">
            · {(s.status.usage.used / 1000).toFixed(1)}k / {(s.status.usage.size / 1000).toFixed(0)}
            k
          </span>
        )}
        {s.inProgress && (
          <button className="link-btn" onClick={() => s.cancel()}>
            Cancelar
          </button>
        )}
        <span className="grow" />
        <span className="current-agent-tag muted">@{s.currentAgent}</span>
        <button
          className={`link-btn ${s.autoApprove ? 'on' : ''}`}
          onClick={() => vscode.postMessage({ type: 'toggle-auto-approve' })}
          title={s.autoApprove ? 'Auto-approve: ON' : 'Auto-approve: OFF'}
        >
          {s.autoApprove ? '✓ auto' : '◯ auto'}
        </button>
      </div>
    </footer>
  );
}
