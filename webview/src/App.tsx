import { useEffect } from 'react';
import { useStore, store as storeInstance } from './state/store';
import { ChatView } from './components/ChatView';
import { CascadeFlow } from './components/CascadeFlow';
import { Onboarding } from './components/Onboarding';
import { vscode } from './utils/vscode';

export function App() {
  const view = document.body.dataset.view ?? 'chat';
  useStore();

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;
      try {
        storeInstance.applyMessage(msg);
      } catch (e) {
        console.error('applyMessage failed', e);
      }
    }
    window.addEventListener('message', onMessage);
    try {
      vscode.postMessage({ type: 'ready' });
    } catch (e) {
      console.error('postMessage(ready) failed', e);
    }
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (view === 'onboarding') return <Onboarding />;
  if (view === 'cascade') return <CascadeFlow />;
  return <ChatView />;
}
