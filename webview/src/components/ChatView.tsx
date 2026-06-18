import { useState } from 'react';
import { useStore } from '../state/store';
import { PermissionDialog } from './PermissionDialog';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ModelPickerPopover } from './ModelPickerPopover';
import { SettingsDrawer } from './SettingsDrawer';
import { ChatHistorySidebar } from './ChatHistorySidebar';

export function ChatView() {
  const s = useStore();
  const [showModelPicker, setShowModelPicker] = useState(false);

  function handleOpenSettings() {
    setShowModelPicker(false);
    s.toggleSettingsDrawer();
  }

  function handleToggleHistory() {
    setShowModelPicker(false);
    s.toggleSidebar();
  }

  function handleNewSession() {
    s.newSession(s.mode);
  }

  function handleCancel() {
    s.cancel();
  }

  return (
    <div className="chat-view">
      <ChatHeader
        inProgress={s.inProgress}
        onOpenSettings={handleOpenSettings}
        onToggleHistory={handleToggleHistory}
        onOpenModelPicker={() => setShowModelPicker(true)}
        onNewSession={handleNewSession}
        onCancel={handleCancel}
      />

      <ChatMessages />

      <ChatInput />

      {/* Model picker popover */}
      {showModelPicker && (
        <div className="model-picker-overlay" onClick={() => setShowModelPicker(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ModelPickerPopover onClose={() => setShowModelPicker(false)} />
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {s.settingsDrawerOpen && (
        <div className="settings-drawer">
          <SettingsDrawer s={s} onClose={() => s.closeSettingsDrawer()} />
        </div>
      )}

      {/* Chat History Sidebar */}
      {s.sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => s.closeSidebar()}>
          <aside className="chat-history-sidebar" onClick={(e) => e.stopPropagation()}>
            <ChatHistorySidebar s={s} onClose={() => s.closeSidebar()} />
          </aside>
        </div>
      )}

      {/* Error banner */}
      {s.error && (
        <div className="banner error sticky" onClick={() => s.clearError()}>
          ❌ {s.error} <small>(clique para fechar)</small>
        </div>
      )}

      {/* Permission dialog */}
      {s.permissionRequest && <PermissionDialog req={s.permissionRequest} />}
    </div>
  );
}






