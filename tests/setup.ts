// Vitest setup — mocks webview-only globals for Node.js test environment

import { vi } from 'vitest';

// Mock window.acquireVsCodeApi for webview code that runs in Node.js tests
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    acquireVsCodeApi: () => ({
      postMessage: vi.fn(),
      setState: vi.fn(),
      getState: () => undefined,
    }),
  };
}
