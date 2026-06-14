import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // ─── Core ────────────────────────────────────────────
    globals: true,
    environment: 'node',
    root: resolve(__dirname),
    include: ['tests/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'dist-webview', '**/*.mjs'],
    setupFiles: ['./tests/setup.ts'],

    // ─── Timeouts ────────────────────────────────────────
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // ─── Mocks ───────────────────────────────────────────
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // ─── Coverage ────────────────────────────────────────
    coverage: {
      enabled: false,
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: ['node_modules/', 'dist/', 'dist-webview/', 'tests/', '**/*.d.ts'],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },

    // ─── TypeScript ──────────────────────────────────────
    typecheck: {
      enabled: false,
      tsconfig: resolve(__dirname, 'tsconfig.json'),
    },

    // ─── Output ──────────────────────────────────────────
    reporters: ['default', 'verbose'],
    outputFile: {
      junit: resolve(__dirname, 'coverage/junit-report.xml'),
    },
  },
});
