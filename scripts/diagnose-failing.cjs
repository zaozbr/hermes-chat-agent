// Diagnóstico detalhado dos modelos que falharam
// Tenta variações: sem :free, com provider alternativo, etc.
const https = require('https');
const fs = require('fs');

function loadKeys() {
  const content = fs.readFileSync(
    'c:/Users/Usuario/Desktop/pessoal/curriculo/html/rasc.md',
    'utf8',
  );
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
  let openrouter = '',
    synthetic = '',
    opencode = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('openroutter') && line.includes('sk-or-v1-'))
      openrouter = line.match(/sk-or-v1-[a-zA-Z0-9]+/)?.[0] || openrouter;
    if (line.startsWith('sinth') && line.includes('syn_'))
      synthetic = line.match(/syn_[a-zA-Z0-9]+/)?.[0] || synthetic;
    if (line.startsWith('oepncode') && line.includes('sk-'))
      opencode = line.match(/sk-[a-zA-Z0-9]+/)?.[0] || opencode;
  }
  return { openrouter, synthetic, opencode };
}

const KEYS = loadKeys();

function testModel(label, endpoint, model, key) {
  return new Promise((resolve) => {
    const url = new URL(endpoint + '/chat/completions');
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say OK.' }],
      max_tokens: 5,
    });
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    };
    const start = Date.now();
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
      });
      res.on('end', () => {
        resolve({
          label,
          model,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          latency: Date.now() - start,
          body: data.substring(0, 300),
        });
      });
    });
    req.on('error', (e) =>
      resolve({ label, model, ok: false, status: 0, latency: Date.now() - start, body: e.message }),
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ label, model, ok: false, status: 0, latency: Date.now() - start, body: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('═══ DIAGNÓSTICO DE MODELOS FALHOS ═══\n');

  const tests = [
    // ── Meta Llama 3.3 70B ──
    {
      label: '1a) Meta Llama 3.3 70B (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.3-70b-instruct',
      key: KEYS.openrouter,
    },
    {
      label: '1b) Meta Llama 3.3 70B (via deepinfra)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'deepinfra/meta-llama/llama-3.3-70b-instruct',
      key: KEYS.openrouter,
    },
    {
      label: '1c) Meta Llama 3.3 70B (via together)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'togethercomputer/meta-llama/llama-3.3-70b-instruct',
      key: KEYS.openrouter,
    },

    // ── Meta Llama 3.2 3B ──
    {
      label: '2a) Meta Llama 3.2 3B (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.2-3b-instruct',
      key: KEYS.openrouter,
    },
    {
      label: '2b) Meta Llama 3.2 3B (via groq)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'groq/meta-llama/llama-3.2-3b-instruct',
      key: KEYS.openrouter,
    },

    // ── Nous Hermes 3 405B ──
    {
      label: '3a) Nous Hermes 3 405B (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'nousresearch/hermes-3-llama-3.1-405b',
      key: KEYS.openrouter,
    },
    {
      label: '3b) Nous Hermes 3 405B (via together)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'togethercomputer/nousresearch/hermes-3-llama-3.1-405b',
      key: KEYS.openrouter,
    },

    // ── Qwen3 Coder 480B ──
    {
      label: '4a) Qwen3 Coder (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'qwen/qwen3-coder',
      key: KEYS.openrouter,
    },
    {
      label: '4b) Qwen3 Coder (via together)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'togethercomputer/qwen/qwen3-coder',
      key: KEYS.openrouter,
    },

    // ── Qwen3 Next 80B ──
    {
      label: '5a) Qwen3 Next 80B (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'qwen/qwen3-next-80b-a3b-instruct',
      key: KEYS.openrouter,
    },

    // ── Venice Uncensored ──
    {
      label: '6a) Venice Dolphin 24B (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition',
      key: KEYS.openrouter,
    },

    // ── Google Lyria 3 Pro ──
    {
      label: '7a) Google Lyria Pro (alt name)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'google/lyria-3-pro-preview:free',
      key: KEYS.openrouter,
    },
    {
      label: '7b) Google Lyria Pro (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'google/lyria-3-pro-preview',
      key: KEYS.openrouter,
    },

    // ── Google Lyria 3 Clip ──
    {
      label: '8a) Google Lyria Clip (alt name)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'google/lyria-3-clip-preview:free',
      key: KEYS.openrouter,
    },
    {
      label: '8b) Google Lyria Clip (sem :free)',
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'google/lyria-3-clip-preview',
      key: KEYS.openrouter,
    },
  ];

  for (const t of tests) {
    process.stdout.write(t.label + '... ');
    const result = await testModel(t.label, t.endpoint, t.model, t.key);
    const icon = result.ok ? '✅ OK' : '❌ FAIL';
    console.log(icon + ' (' + result.status + ', ' + result.latency + 'ms)');
    if (!result.ok) {
      // Show full error body for diagnosis
      try {
        const parsed = JSON.parse(result.body);
        const errMsg = parsed.error?.message || parsed.error || '(no error field)';
        console.log('   └─ Error: ' + JSON.stringify(errMsg).substring(0, 200));
      } catch {
        console.log('   └─ Raw: ' + result.body.substring(0, 200));
      }
    }
  }

  console.log('\n═══ DIAGNÓSTICO CONCLUÍDO ═══');
}

main().catch(console.error);
