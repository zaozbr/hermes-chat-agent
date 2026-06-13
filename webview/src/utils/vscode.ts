// Bridge between webview and extension host.
// Re-exposed as `vscode` so components can import it.

export interface VsCodeBridge {
  postMessage(msg: unknown): void;
  setState(state: unknown): void;
  getState(): unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeBridge;
  }
}

let _api: VsCodeBridge | null = null;

export function getVsCode(): VsCodeBridge {
  if (!_api) {
    if (typeof window.acquireVsCodeApi === 'function') {
      _api = window.acquireVsCodeApi();
    } else {
      // dev fallback (running in plain browser) — log to console
      _api = {
        postMessage: (msg) => console.log('[vscode.postMessage]', msg),
        setState: () => {},
        getState: () => undefined,
      };
    }
  }
  return _api;
}

export const vscode = getVsCode();
