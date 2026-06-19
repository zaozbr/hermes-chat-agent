import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const CI = process.env.CI === 'true';

export default defineConfig({
  test: {
    // ─── Core ────────────────────────────────────────────
    name: 'hermes-agent',
    globals: true,
    environment: 'node',
    root: resolve(__dirname),
    include: ['tests/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'dist-webview', 'tests/e2e', '**/*.mjs'],
    setupFiles: ['./tests/setup.ts'],

    // ─── Timeouts ────────────────────────────────────────
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // ─── Mocks ───────────────────────────────────────────
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // ─── Coverage (80% min em CI) ─────────────────────────
    coverage: {
      enabled: CI,
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-webview/',
        'tests/',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        statements: CI ? 80 : 0,
        branches: CI ? 70 : 0,
        functions: CI ? 75 : 0,
        lines: CI ? 80 : 0,
      },
    },

    // ─── TypeScript ──────────────────────────────────────
    typecheck: {
      enabled: false,
      tsconfig: resolve(__dirname, 'tsconfig.json'),
    },

    // ─── Output ──────────────────────────────────────────
    reporters: CI ? ['default', 'junit'] : ['default', 'verbose'],
    outputFile: CI ? { junit: resolve(__dirname, 'coverage/junit-report.xml') } : undefined,
  },
});
