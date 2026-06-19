// Diagnose session config and set model
import { spawn } from 'node:child_process';

const proc = spawn('hermes', ['acp', '--accept-hooks'], { stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';

proc.stdout.on('data', (d) => {
  stdout += d.toString();
});
proc.stderr.on('data', () => {});

function send(m) {
  proc.stdin.write(JSON.stringify(m) + '\n');
}

function waitFor(id, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    function check() {
      for (const line of stdout.split('\n').filter(Boolean)) {
        try {
          const p = JSON.parse(line);
          if (p.id === id) {
            clearTimeout(timer);
            resolve(p);
            return;
          }
        } catch {}
      }
      setImmediate(check);
    }
    check();
  });
}

async function main() {
  // 1. Initialize
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: 1,
      clientCapabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  });
  const init = await waitFor(1);
  console.log('Agent:', init.result?.agentInfo?.name, init.result?.agentInfo?.version);
  console.log('Init result keys:', Object.keys(init.result || {}));
  if (init.result?.authenticationMethods) {
    console.log('Auth methods:', init.result.authenticationMethods.map((a) => a.id).join(', '));
  }

  // 2. Initialized
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 300));

  // 3. New session
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'session/new',
    params: {
      cwd: process.cwd(),
      toolsets: [],
      mcpServers: [],
    },
  });
  const sess = await waitFor(3);
  const sid = sess.result?.sessionId;
  const models = sess.result?.models;
  console.log('\n=== Session Info ===');
  console.log('Session:', sid);
  if (models) {
    console.log('Available:', models.availableModels?.length || 0);
    console.log('Current model obj:', JSON.stringify(models.currentModel).slice(0, 300));
    // Show first 3 available models
    const first3 = (models.availableModels || []).slice(0, 3);
    console.log('First models:', first3.map((m) => `${m.id} (${m.provider})`).join(', '));
  }

  // 4. Set config option: model
  console.log('\n=== Set Config: model ===');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/set_config_option',
    params: {
      sessionId: sid,
      option: 'model',
      value: 'mistralai/mistral-large-2-instruct',
    },
  });
  const conf = await waitFor(4);
  console.log('Config set:', conf.result ? '✅' : '❌', conf.error?.message || '');

  // 5. Re-check model
  send({ jsonrpc: '2.0', id: 5, method: 'session/list', params: {} });
  const list = await waitFor(5);
  const s = (list.result?.sessions || []).find((s) => s.id === sid);
  if (s)
    console.log('Session model now:', JSON.stringify(s.config?.model || s.model).slice(0, 200));

  // 6. Prompt
  console.log('\n=== Prompt ===');
  send({
    jsonrpc: '2.0',
    id: 6,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Say hello in one word.' }],
    },
  });

  await new Promise((r) => setTimeout(r, 30000));
  proc.kill();

  // Analyze
  let foundText = false;
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.id === 6) {
        const r = p.result || {};
        console.log('Prompt stopReason:', r.stopReason);
        if (r.content) {
          console.log('Content:', JSON.stringify(r.content).slice(0, 500));
          foundText = true;
        }
        if (r.message) {
          console.log('Message:', JSON.stringify(r.message).slice(0, 500));
          foundText = true;
        }
      }
      if (p.method === 'session/update') {
        const upd = p.params?.update || {};
        if (upd.content) {
          console.log('UPDATE content:', JSON.stringify(upd.content).slice(0, 400));
          foundText = true;
        } else if (upd.delta?.text) {
          console.log('DELTA text:', upd.delta.text);
          foundText = true;
        } else if (upd.message?.content) {
          console.log('MESSAGE:', JSON.stringify(upd.message.content).slice(0, 400));
          foundText = true;
        } else if (upd.usage) {
          console.log('USAGE:', JSON.stringify(upd.usage));
        }
      }
    } catch {}
  }
  if (!foundText) console.log('NO TEXT CONTENT in any response');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
