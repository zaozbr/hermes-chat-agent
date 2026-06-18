// ────────────────────────────────────────────────────────────────────────────
// 🎭 Playwright — E2E Test Configuration
// ────────────────────────────────────────────────────────────────────────────
// Testa o webview buildado (dist-webview/) em um navegador headless.
// Não depende do VS Code — testa os assets estáticos da UI.
// ────────────────────────────────────────────────────────────────────────────

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  /* Timeout máximo por teste */
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  /* Rodar em paralelo */
  fullyParallel: true,
  /* Falhar se não encontrar tests */
  forbidOnly: !!process.env.CI,
  /* 3 tentativas em CI */
  retries: process.env.CI ? 2 : 0,
  /* 2 workers em CI, 1 local (webview é single-thread) */
  workers: process.env.CI ? 2 : 1,
  /* Reporters */
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'playwright-report/e2e-junit.xml' }],
        ['list'],
      ]
    : [['html', { outputFolder: 'playwright-report' }], ['list']],
  /* Output dir para screenshots/videos */
  outputDir: 'test-results/e2e/',

  use: {
    /* Base URL para testes do webview */
    baseURL: `file://${path.resolve(__dirname, 'dist-webview')}/index.html`,
    /* Rastrear em caso de falha */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    /* Screenshot em falha */
    screenshot: 'only-on-failure',
  },

  /* Projetos */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Headless para CI, headed para debug local */
        headless: !process.env.DEBUG,
      },
    },
  ],
});
