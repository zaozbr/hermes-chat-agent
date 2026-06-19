// Full diagnostic: dump models structure and try different config keys
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

  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 300));

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

  console.log('\n=== Models Structure ===');
  if (models) {
    console.log('Keys:', Object.keys(models));
    console.log('Available length:', models.availableModels?.length);
    if (models.availableModels?.length > 0) {
      const m = models.availableModels[0];
      console.log('First model:', JSON.stringify(m, null, 2).slice(0, 1000));
    }
    if (models.currentModel) {
      console.log('Current model:', JSON.stringify(models.currentModel, null, 2));
    }
  }

  // Dump full session result structure
  console.log('\n=== Session Result Keys ===');
  const sr = sess.result || {};
  console.log(Object.keys(sr));

  // Look for any config
  if (sr.config) {
    console.log('Config:', JSON.stringify(sr.config));
  }

  // Try setting config with different option names
  const options = ['default', 'model_id', 'llm', 'provider', 'default_model'];
  for (const opt of options) {
    send({
      jsonrpc: '2.0',
      id: 100 + options.indexOf(opt),
      method: 'session/set_config_option',
      params: {
        sessionId: sid,
        option: opt,
        value: 'mistralai/mistral-large-2-instruct',
      },
    });
    const r = await waitFor(100 + options.indexOf(opt));
    console.log(`\nConfig '${opt}':`, r.result ? 'OK' : 'FAIL', r.error?.message || '');
  }

  proc.kill();
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
