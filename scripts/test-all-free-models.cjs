// Test ALL FREE models with REAL API keys from configuration
// Usage: node scripts/test-all-free-models.cjs
const https = require('https');
const http = require('http');

// ─── LOAD KEYS FROM EXTERNAL FILE ─────────────────────────────────
const fs = require('fs');

function loadKeys() {
  const keyFile = 'c:/Users/Usuario/Desktop/pessoal/curriculo/html/rasc.md';
  const content = fs.readFileSync(keyFile, 'utf8');
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  let openrouter = '',
    synthetic = '',
    opencode = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('openroutter') && line.includes('sk-or-v1-')) {
      openrouter = line.match(/sk-or-v1-[a-zA-Z0-9]+/)?.[0] || openrouter;
    }
    if (line.startsWith('sinth') && line.includes('syn_')) {
      synthetic = line.match(/syn_[a-zA-Z0-9]+/)?.[0] || synthetic;
    }
    if (line.startsWith('oepncode') && line.includes('sk-')) {
      opencode = line.match(/sk-[a-zA-Z0-9]+/)?.[0] || opencode;
    }
  }

  console.log(
    'Keys loaded: OR=' +
      openrouter.substring(0, 12) +
      '..., Syn=' +
      synthetic.substring(0, 8) +
      '..., OC=' +
      opencode.substring(0, 8) +
      '...',
  );
  return { openrouter, synthetic, opencode };
}

const KEYS = loadKeys();

// ─── MODELS TO TEST ────────────────────────────────────────────────
const models = [
  // ── OpenRouter FREE models (26) ──
  {
    name: '[FREE] Free Models Router',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Meta Llama 3.3 70B Instruct',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Meta Llama 3.2 3B Instruct',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Nous Hermes 3 405B Instruct',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nousresearch/hermes-3-llama-3.1-405b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Qwen3 Coder 480B A35B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen3-coder:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Qwen3 Next 80B A3B Instruct',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen3-next-80b-a3b-instruct:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] OpenAI GPT-OSS 120B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-oss-120b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] OpenAI GPT-OSS 20B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-oss-20b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Google Gemma 4 31B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Google Gemma 4 26B A4B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-26b-a4b-it:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Google Lyria 3 Pro Preview',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'google/lyria-3-pro-preview',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Google Lyria 3 Clip Preview',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'google/lyria-3-clip-preview',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3 Ultra',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3 Super',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3 Nano 30B A3B',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-3-nano-30b-a3b:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3 Nano Omni Reasoning',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron Nano 12B V2 VL',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-nano-12b-v2-vl:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron Nano 9B V2',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-nano-9b-v2:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3.5 Content Safety',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nvidia/nemotron-3.5-content-safety:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Liquid LFM2.5 1.2B Thinking',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'liquid/lfm-2.5-1.2b-thinking:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Liquid LFM2.5 1.2B Instruct',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'liquid/lfm-2.5-1.2b-instruct:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Poolside Laguna XS.2',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'poolside/laguna-xs.2:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Poolside Laguna M.1',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'poolside/laguna-m.1:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Venice Uncensored (Dolphin 24B)',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] Nex AGI Nex-N2-Pro',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'nex-agi/nex-n2-pro:free',
    key: KEYS.openrouter,
  },
  {
    name: '[FREE] OpenRouter Owl Alpha',
    provider: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openrouter/owl-alpha',
    key: KEYS.openrouter,
  },

  // ── Synthetic FREE models (6) ──
  {
    name: '[FREE] GLM-5.1 (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:zai-org/GLM-5.1',
    key: KEYS.synthetic,
  },
  {
    name: '[FREE] GLM-4.7 Flash (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:zai-org/GLM-4.7-Flash',
    key: KEYS.synthetic,
  },
  {
    name: '[FREE] Kimi K2.6 (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:moonshotai/Kimi-K2.6',
    key: KEYS.synthetic,
  },
  {
    name: '[FREE] Qwen3.6 27B (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:Qwen/Qwen3.6-27B',
    key: KEYS.synthetic,
  },
  {
    name: '[FREE] MiniMax M3 (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:MiniMaxAI/MiniMax-M3',
    key: KEYS.synthetic,
  },
  {
    name: '[FREE] NVIDIA Nemotron 3 120B (Synthetic)',
    provider: 'Synthetic',
    endpoint: 'https://api.synthetic.new/openai/v1',
    model: 'hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4',
    key: KEYS.synthetic,
  },

  // ── OpenCode Zen FREE (1 model) - NOT TESTING per user request ──
  // DeepSeek V4 Flash Free — skipped per user instruction
];

// ─── TEST FUNCTION ──────────────────────────────────────────────────
function testModel(m) {
  return new Promise((resolve) => {
    const url = new URL(m.endpoint + '/chat/completions');
    const body = JSON.stringify({
      model: m.model,
      messages: [{ role: 'user', content: 'Say OK and nothing else.' }],
      max_tokens: 5,
    });

    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + m.key,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 20000,
    };

    const mod = url.protocol === 'https:' ? https : http;
    const start = Date.now();
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
      });
      res.on('end', () => {
        const latency = Date.now() - start;
        let ok = res.statusCode >= 200 && res.statusCode < 300;
        let errorMsg = '';
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            ok = false;
            errorMsg = parsed.error.message || JSON.stringify(parsed.error).substring(0, 150);
          }
        } catch (e) {
          if (!ok) errorMsg = data.substring(0, 150);
        }
        resolve({ ...m, ok, status: res.statusCode, latency, error: errorMsg });
      });
    });
    req.on('error', (e) =>
      resolve({ ...m, ok: false, status: 0, latency: Date.now() - start, error: e.message }),
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ...m, ok: false, status: 0, latency: Date.now() - start, error: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

// ─── MAIN ───────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       TESTING ALL FREE MODELS — REAL API KEYS              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const results = [];
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    process.stdout.write(
      '[' + (i + 1) + '/' + models.length + '] ' + m.provider + ' | ' + m.name + '... ',
    );
    const result = await testModel(m);
    results.push(result);
    const icon = result.ok ? '✅ OK' : '❌ FAIL';
    console.log(
      icon +
        ' (' +
        result.status +
        ', ' +
        result.latency +
        'ms)' +
        (result.error ? ' — ' + result.error.substring(0, 120) : ''),
    );
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────
  const working = results.filter((r) => r.ok);
  const failing = results.filter((r) => !r.ok);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(
    '  Total: ' +
      results.length +
      ' | ✅ Working: ' +
      working.length +
      ' | ❌ Failing: ' +
      failing.length,
  );

  if (failing.length > 0) {
    console.log('\n─── ❌ MODELS NOT WORKING ────────────────────────────────────');
    failing.forEach((r) => {
      console.log('  [' + r.provider + '] ' + r.name);
      console.log('    Status: ' + r.status + ' | ' + r.latency + 'ms');
      console.log('    Error: ' + (r.error || '(none)').substring(0, 200));
      console.log();
    });
  }

  if (working.length > 0) {
    console.log('\n─── ✅ WORKING MODELS ────────────────────────────────────────');
    working.forEach((r) =>
      console.log('  ✅ [' + r.provider + '] ' + r.name + ' (' + r.latency + 'ms)'),
    );
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Save results to JSON
  const fs = require('fs');
  const output = {
    timestamp: new Date().toISOString(),
    total: results.length,
    working: working.length,
    failing: failing.length,
    results: results.map((r) => ({
      provider: r.provider,
      model: r.model,
      name: r.name,
      ok: r.ok,
      status: r.status,
      latency: r.latency,
      error: r.error ? r.error.substring(0, 500) : '',
    })),
  };
  fs.writeFileSync('free-models-test-results.json', JSON.stringify(output, null, 2));
  console.log('📁 Results saved to free-models-test-results.json');
}

main().catch(console.error);
