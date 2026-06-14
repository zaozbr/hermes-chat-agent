// Test FREE models on OpenRouter — run: node scripts/test-free-models.cjs
const https = require('https');
const http = require('http');

const openRouterModels = [
  { id: 'openrouter/free', name: 'Free Models Router' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta Llama 3.2 3B Instruct' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Nous Hermes 3 405B Instruct' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder 480B A35B' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B A3B Instruct' },
  { id: 'openai/gpt-oss-120b:free', name: 'OpenAI GPT-OSS 120B' },
  { id: 'openai/gpt-oss-20b:free', name: 'OpenAI GPT-OSS 20B' },
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google Gemma 4 26B A4B' },
  { id: 'google/lyria-3-pro-preview', name: 'Google Lyria 3 Pro Preview' },
  { id: 'google/lyria-3-clip-preview', name: 'Google Lyria 3 Clip Preview' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'NVIDIA Nemotron 3 Ultra' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 Super' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'NVIDIA Nemotron 3 Nano 30B A3B' },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'NVIDIA Nemotron 3 Nano Omni Reasoning',
  },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA Nemotron Nano 12B V2 VL' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'NVIDIA Nemotron Nano 9B V2' },
  { id: 'nvidia/nemotron-3.5-content-safety:free', name: 'NVIDIA Nemotron 3.5 Content Safety' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'Liquid LFM2.5 1.2B Thinking' },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'Liquid LFM2.5 1.2B Instruct' },
  { id: 'poolside/laguna-xs.2:free', name: 'Poolside Laguna XS.2' },
  { id: 'poolside/laguna-m.1:free', name: 'Poolside Laguna M.1' },
  {
    id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    name: 'Venice Uncensored (Dolphin Mistral 24B)',
  },
  { id: 'nex-agi/nex-n2-pro:free', name: 'Nex AGI Nex-N2-Pro' },
  { id: 'openrouter/owl-alpha', name: 'OpenRouter Owl Alpha' },
];

// Also test: Nvidia free models?
// Nvidia endpoint at integrate.api.nvidia.com might have free tier

async function testModel(baseUrl, modelId, apiKey, endpointName) {
  return new Promise((resolve) => {
    const url = new URL(baseUrl + '/chat/completions');
    const data = JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: 'Say OK and nothing else.' }],
      max_tokens: 5,
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    };

    if (apiKey) {
      options.headers['Authorization'] = 'Bearer ' + apiKey;
    }

    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let status = res.statusCode;
        let ok = status >= 200 && status < 300;
        let errorInfo = '';
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            ok = false;
            errorInfo = parsed.error.message || JSON.stringify(parsed.error).substring(0, 120);
          }
        } catch (e) {
          if (ok) errorInfo = '(parse error: ' + body.substring(0, 60) + ')';
        }
        resolve({
          modelId,
          name: modelId,
          endpointName,
          ok,
          status,
          errorInfo: errorInfo || body.substring(0, 120),
        });
      });
    });
    req.on('error', (e) =>
      resolve({ modelId, name: modelId, endpointName, ok: false, status: 0, errorInfo: e.message }),
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ modelId, name: modelId, endpointName, ok: false, status: 0, errorInfo: 'timeout' });
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== TESTING OPENROUTER FREE MODELS (without API key) ===\n');

  const results = [];
  for (const model of openRouterModels) {
    process.stdout.write('Testing ' + model.name + '... ');
    const result = await testModel('https://openrouter.ai/api/v1', model.id, null, 'OpenRouter');
    result.displayName = model.name;
    results.push(result);
    console.log(
      result.ok ? 'OK' : 'FAIL',
      '(' + result.status + ') ' + (result.errorInfo || '').substring(0, 80),
    );
  }

  console.log('\n=== SUMMARY ===');
  const working = results.filter((r) => r.ok);
  const failing = results.filter((r) => !r.ok);

  console.log('\n--- WORKING (' + working.length + ') ---');
  working.forEach((r) => console.log('  OK: ' + r.displayName));

  console.log('\n--- NOT WORKING (' + failing.length + ') ---');
  failing.forEach((r) =>
    console.log(
      '  FAIL: ' + r.displayName + ' [' + r.status + '] ' + (r.errorInfo || '').substring(0, 100),
    ),
  );
}

main().catch(console.error);
