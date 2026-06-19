// Test ACP — set chat mode before prompting
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

function collectUntil(ms) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(stdout.split('\n').filter(Boolean)), ms),
  );
}

async function main() {
  // 1. Initialize
  console.log('=== 1. Initialize ===');
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
  console.log('Agent:', init.result?.agentInfo?.name, '@', init.result?.agentInfo?.version);
  console.log('Auth methods:', init.result?.authenticationMethods?.map((a) => a.id).join(', '));

  // 2. Initialized
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 300));

  // 3. Try authenticate
  console.log('\n=== 2. Authenticate ===');
  send({ jsonrpc: '2.0', id: 2, method: 'authenticate', params: { methodId: 'openrouter' } });
  const auth = await waitFor(2);
  console.log('Auth success:', !!auth.result?.authenticated);
  if (auth.error) console.log('Auth ERROR:', JSON.stringify(auth.error).slice(0, 500));
  if (auth.result) console.log('Auth:', JSON.stringify(auth.result).slice(0, 500));

  // 4. New session
  console.log('\n=== 3. Session/New ===');
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
  console.log('Session:', sid);
  console.log('Models available:', sess.result?.models?.availableModels?.length || 0);
  console.log('Current model:', sess.result?.models?.currentModel?.id || 'unknown');

  // 5. Set mode to chat
  console.log('\n=== 4. Set mode: chat ===');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/set_mode',
    params: {
      sessionId: sid,
      mode: 'chat',
    },
  });
  const mode = await waitFor(4);
  console.log('Mode set result:', mode.result || mode.error?.message || 'unknown');

  // 6. Prompt
  console.log('\n=== 5. Prompt ===');
  send({
    jsonrpc: '2.0',
    id: 5,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Say hello in one word.' }],
    },
  });

  await new Promise((r) => setTimeout(r, 25000));
  proc.kill();

  // Analyze
  console.log('\n=== Analysis ===');
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.id === 5) {
        console.log('Prompt response:', JSON.stringify(p).slice(0, 600));
      }
      if (p.method === 'session/update') {
        const upd = p.params?.update || {};
        const keys = Object.keys(upd);
        if (upd.content) {
          console.log('  CONTENT:', JSON.stringify(upd.content).slice(0, 400));
        } else if (upd.delta?.text) {
          console.log('  DELTA:', upd.delta.text);
        } else if (upd.message?.content) {
          console.log('  MESSAGE:', JSON.stringify(upd.message.content).slice(0, 400));
        } else if (upd.text) {
          console.log('  TEXT:', upd.text);
        } else if (upd.usage) {
          console.log('  USAGE:', JSON.stringify(upd.usage));
        } else {
          console.log(`  update: [${keys.join(', ')}]`);
        }
      }
    } catch {}
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
