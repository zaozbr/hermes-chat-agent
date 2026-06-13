import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';
import './styles/components.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('root element not found');
}

try {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e) {
  const err = e as Error;
  root.innerHTML = `<div style="padding:14px;color:#f48771;font-family:monospace;font-size:12px;background:#1e1e1e;height:100%;overflow:auto;">
    <h3 style="margin:0 0 8px;color:#f48771">Render error</h3>
    <pre style="white-space:pre-wrap;word-break:break-word;">${err.message}\n${err.stack ?? ''}</pre>
  </div>`;
}

// Global error handler so uncaught errors are visible
window.addEventListener('error', (ev) => {
  if (root && !root.querySelector('.render-error')) {
    const div = document.createElement('div');
    div.className = 'render-error';
    div.style.cssText = 'padding:14px;color:#f48771;font-family:monospace;font-size:12px;background:#1e1e1e;border:1px solid #f48771;margin:8px;border-radius:4px;';
    div.innerHTML = `<strong>Webview error:</strong><br><pre style="white-space:pre-wrap;word-break:break-word;margin:4px 0 0;">${ev.message} (${ev.filename}:${ev.lineno})</pre>`;
    root.prepend(div);
  }
});
window.addEventListener('unhandledrejection', (ev) => {
  if (root && !root.querySelector('.render-error')) {
    const div = document.createElement('div');
    div.className = 'render-error';
    div.style.cssText = 'padding:14px;color:#f48771;font-family:monospace;font-size:12px;background:#1e1e1e;border:1px solid #f48771;margin:8px;border-radius:4px;';
    const reason = (ev.reason instanceof Error) ? `${ev.reason.message}\n${ev.reason.stack}` : String(ev.reason);
    div.innerHTML = `<strong>Promise rejection:</strong><br><pre style="white-space:pre-wrap;word-break:break-word;margin:4px 0 0;">${reason}</pre>`;
    root.prepend(div);
  }
});
