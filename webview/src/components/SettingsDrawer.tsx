import { useState } from 'react';
import { useStore } from '../state/store';
import { ConfigPanel } from './panels/ConfigPanel';
import { McpPanel } from './panels/McpPanel';
import { TweaksPanel } from './panels/TweaksPanel';

const TABS = [
  { id: 'config', icon: '⚙', label: 'Config' },
  { id: 'mcp', icon: '🔌', label: 'MCP' },
  { id: 'tweaks', icon: '⚡', label: 'Tweaks' },
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

export function SettingsDrawer({
  s,
  onClose,
}: {
  s: ReturnType<typeof useStore>;
  onClose: () => void;
}) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('config');

  return (
    <div className="settings-content">
      <div className="settings-header">
        <h3>⚙ Configurações</h3>
        <button className="header-btn" onClick={onClose} title="Fechar">
          ✕
        </button>
      </div>
      <nav className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tab ${settingsTab === t.id ? 'active' : ''}`}
            onClick={() => setSettingsTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>
      <div className="settings-body">
        {settingsTab === 'config' && <ConfigPanel s={s} />}
        {settingsTab === 'mcp' && <McpPanel s={s} />}
        {settingsTab === 'tweaks' && <TweaksPanel s={s} />}
      </div>
    </div>
  );
}
