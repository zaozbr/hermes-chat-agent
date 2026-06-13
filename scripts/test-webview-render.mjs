import { chromium } from 'playwright-chromium';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';

const indexPath = resolve('dist-webview/index.html');
if (!existsSync(indexPath)) {
  console.error('dist-webview/index.html not found');
  process.exit(1);
}

const PORT = 5180;
const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = resolve('dist-webview' + url);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const ext = filePath.endsWith('.html') ? 'text/html'
    : filePath.endsWith('.js') ? 'text/javascript'
    : filePath.endsWith('.css') ? 'text/css'
    : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ext });
  res.end(readFileSync(filePath));
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const consoleMsgs = [];

page.on('console', (msg) => {
  consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  errors.push(`PAGEERROR: ${err.message}\n${err.stack}`);
});
page.on('requestfailed', (req) => {
  errors.push(`REQFAIL: ${req.url()} - ${req.failure()?.errorText}`);
});

await page.addInitScript(() => {
  window.acquireVsCodeApi = () => ({
    postMessage: (m) => console.log('[vscode.postMessage]', JSON.stringify(m)),
    getState: () => undefined,
    setState: () => {},
  });
  // Add body data-view for chat
  document.addEventListener('DOMContentLoaded', () => {
    document.body.dataset.view = 'chat';
  });
});

await page.goto(`http://127.0.0.1:${PORT}/index.html`);
await page.waitForTimeout(3000);

const rootContent = await page.evaluate(() => {
  const root = document.getElementById('root');
  return {
    hasRoot: !!root,
    innerHTML: root?.innerHTML?.slice(0, 3000) ?? null,
    childCount: root?.childElementCount ?? 0,
    bodyDataView: document.body.dataset.view,
  };
});

console.log('--- Root content (first 3KB) ---');
console.log(rootContent.innerHTML ?? 'null');
console.log('--- Child count ---', rootContent.childCount);
console.log('--- Body dataset view ---', rootContent.bodyDataView);
console.log('--- Console messages ---');
consoleMsgs.slice(0, 30).forEach((m) => console.log(m));
console.log('--- Errors ---');
errors.slice(0, 10).forEach((e) => console.log(e));
await browser.close();
server.close();
