import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  root: resolve(__dirname, 'webview'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'dist-webview'),
    emptyOutDir: true,
    sourcemap: mode !== 'production',
    minify: mode === 'production',
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'webview/index.html'),
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/main.[ext]',
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
}));
