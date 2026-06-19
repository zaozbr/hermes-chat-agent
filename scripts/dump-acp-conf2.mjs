// Diagnose session config and try setting model
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
  console.log('Auth methods:', init.result?.authMethods?.map((a) => a.id).join(', '));

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
    console.log('Available models:', models.availableModels?.length);
    // Show first 5 available models
    const first5 = (models.availableModels || []).slice(0, 5);
    first5.forEach((m) => console.log(`  ${m.id} (${m.provider})`));
    console.log('Current model:', models.currentModel?.id || 'NONE SET');
  }

  // 4. Try setting model
  console.log('\n=== Set config: model ===');
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
  console.log('Result:', conf.result ? 'OK' : 'FAIL', conf.error?.message || '');

  // 5. Prompt
  console.log('\n=== Prompt ===');
  send({
    jsonrpc: '2.0',
    id: 5,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Reply with exactly: Hello!' }],
    },
  });

  await new Promise((r) => setTimeout(r, 25000));
  proc.kill();

  // 6. Analyze
  console.log('\n=== Analysis ===');
  let found = false;
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.id === 5) {
        const r = p.result || {};
        console.log('stopReason:', r.stopReason);
        if (r.message) {
          console.log('MESSAGE:', JSON.stringify(r.message).slice(0, 500));
          found = true;
        }
      }
      if (p.method === 'session/update') {
        const upd = p.params?.update || {};
        const keys = Object.keys(upd);
        if (upd.delta?.text) {
          console.log('DELTA:', upd.delta.text);
          found = true;
        } else if (upd.content) {
          console.log('CONTENT:', JSON.stringify(upd.content).slice(0, 500));
          found = true;
        } else if (upd.message) {
          console.log('MSG:', JSON.stringify(upd.message).slice(0, 500));
          found = true;
        } else if (keys.includes('type') && upd.type === 'text') {
          console.log('TEXT:', upd.text);
          found = true;
        } else if (upd.usage) {
          console.log('USAGE:', JSON.stringify(upd));
        } else if (!upd.availableCommands && !upd.sessionUpdate && !upd.size) {
          console.log('OTHER:', JSON.stringify(upd).slice(0, 300));
        }
      }
    } catch {}
  }
  if (!found) console.log('NO TEXT OUTPUT');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
