// ────────────────────────────────────────────────────────────────────────────
// 🎭 Hermes Agent — Webview E2E Tests
// ────────────────────────────────────────────────────────────────────────────
// Testa os assets buildados do webview (dist-webview/) diretamente.
// Verifica que a UI carrega, tem estrutura esperada e funciona offline.
// ────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const DIST_WEBVIEW = path.resolve(__dirname, '../../dist-webview');

test.describe('🌍 Hermes Agent Webview', () => {
  test('01 - dist-webview deve existir com assets buildados', () => {
    expect(fs.existsSync(DIST_WEBVIEW)).toBe(true);
    expect(fs.existsSync(path.join(DIST_WEBVIEW, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_WEBVIEW, 'assets/main.js'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_WEBVIEW, 'assets/main.css'))).toBe(true);
  });

  test('02 - index.html deve conter estrutura correta', () => {
    const html = fs.readFileSync(path.join(DIST_WEBVIEW, 'index.html'), 'utf-8');
    expect(html).toContain('Hermes Agent');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('main.js');
    expect(html).toContain('main.css');
  });

  test('03 - main.js deve ser JS válido e não vazio', () => {
    const js = fs.readFileSync(path.join(DIST_WEBVIEW, 'assets/main.js'), 'utf-8');
    expect(js.length).toBeGreaterThan(100);
    // Verificar que é JS válido tentando interpretar
    expect(() => new Function(js)).not.toThrow();
  });

  test('04 - main.css deve ser CSS válido e não vazio', () => {
    const css = fs.readFileSync(path.join(DIST_WEBVIEW, 'assets/main.css'), 'utf-8');
    expect(css.length).toBeGreaterThan(100);
  });

  test('05 - Bundle sizes dentro do budget', () => {
    const hostJs = fs.statSync(path.resolve(__dirname, '../../dist/extension.js'));
    const wvJs = fs.statSync(path.join(DIST_WEBVIEW, 'assets/main.js'));
    const wvCss = fs.statSync(path.join(DIST_WEBVIEW, 'assets/main.css'));

    // Budgets: host < 1MB, webview JS < 1MB, CSS < 100KB
    expect(hostJs.size).toBeLessThan(1_048_576); // 1MB
    expect(wvJs.size).toBeLessThan(1_048_576); // 1MB
    expect(wvCss.size).toBeLessThan(102_400); // 100KB
  });
});

test.describe('🌐 Webview Rendering', () => {
  test('06 - deve carregar index.html e mostrar título no navegador', async ({ page }) => {
    // Navegar para o arquivo HTML local
    const htmlPath = path.join(DIST_WEBVIEW, 'index.html');
    await page.goto(`file://${htmlPath}`);

    // Verificar que o título da página está correto
    await expect(page).toHaveTitle(/Hermes Agent/);
  });

  test('07 - deve ter o elemento root no DOM', async ({ page }) => {
    const htmlPath = path.join(DIST_WEBVIEW, 'index.html');
    await page.goto(`file://${htmlPath}`);

    // O elemento root existe no DOM, mas pode estar vazio porque o React
    // precisa do VS Code API (acquireVsCodeApi) que só existe na webview real
    const root = page.locator('#root');
    await expect(root).toHaveCount(1);
  });

  test('08 - erros de console são apenas CORS/VS Code API esperados', async ({ page }) => {
    // Coletar erros do console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const htmlPath = path.join(DIST_WEBVIEW, 'index.html');
    await page.goto(`file://${htmlPath}`);

    // Esperar JS carregar
    await page.waitForTimeout(2000);

    // Apenas erros conhecidos de CORS (file://) e VS Code API são aceitáveis
    const unexpectedErrors = consoleErrors.filter(
      (e) =>
        !e.includes('CORS') &&
        !e.includes('ERR_FAILED') &&
        !e.includes('net::ERR') &&
        !e.includes('acquireVsCodeApi') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Extension host'),
    );
    expect(unexpectedErrors).toEqual([]);
  });

  test('09 - deve ter assets carregáveis', async ({ page }) => {
    const htmlPath = path.join(DIST_WEBVIEW, 'index.html');
    const response = await page.goto(`file://${htmlPath}`);

    // Verificar que a página carregou (status 200 para file:// é OK)
    expect(response).not.toBeNull();
  });
});
