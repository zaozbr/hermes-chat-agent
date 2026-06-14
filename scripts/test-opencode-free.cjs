const https = require('https');

function testModel(name, id, baseUrl) {
  return new Promise((resolve) => {
    const url = new URL(baseUrl);
    const body = JSON.stringify({
      model: id,
      messages: [{ role: 'user', content: 'Say OK and nothing else.' }],
      max_tokens: 5,
    });
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let msg = '';
        try {
          const j = JSON.parse(data);
          msg = j.error?.message || j.choices?.[0]?.message?.content || data.substring(0, 200);
        } catch (e) {
          msg = data.substring(0, 200);
        }
        resolve({ name, status: res.statusCode, msg });
      });
    });
    req.on('error', (e) => resolve({ name, status: 0, msg: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== TESTING OPENCODE ZEN FREE MODELS ===\n');

  const tests = [
    {
      name: 'MiniMax-M2.1 (Anthropic Msgs)',
      id: 'minimax-m2.1-free',
      baseUrl: 'https://opencode.ai/zen/v1/chat/completions',
    },
    {
      name: 'DeepSeek V4 Flash (OpenAI Resp)',
      id: 'deepseek-v4-flash-free',
      baseUrl: 'https://opencode.ai/zen/v1/responses',
    },
  ];

  for (const t of tests) {
    const r = await testModel(t.name, t.id, t.baseUrl);
    const icon = r.status === 200 ? '  OK' : 'FAIL';
    console.log(icon + ': ' + t.name + ' [' + r.status + '] ' + r.msg.substring(0, 150));
  }

  console.log('\n=== DONE ===');
}

main();
