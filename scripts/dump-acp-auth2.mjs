// Test ACP with CORRECT authenticate step
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

  // 2. Initialized
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 300));

  // 3. Authenticate with CORRECT params (methodId, not method)
  console.log('\n=== 2. Authenticate (methodId: openrouter) ===');
  send({ jsonrpc: '2.0', id: 2, method: 'authenticate', params: { methodId: 'openrouter' } });
  const auth = await waitFor(2);
  console.log('Auth result:', auth.result?.authenticated ? '✅ authenticated' : '❌ failed');
  if (auth.error) console.log('Auth error:', JSON.stringify(auth.error).slice(0, 300));

  // 4. New session (AFTER auth)
  console.log('\n=== 3. Session/New ===');
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'session/new',
    params: {
      cwd: process.cwd(),
      toolsets: ['web'],
      mcpServers: [],
    },
  });
  const sess = await waitFor(3);
  const sid = sess.result?.sessionId;
  console.log('Session:', sid, '| models:', sess.result?.models?.availableModels?.length || 0);

  // 5. Prompt
  console.log('\n=== 4. Prompt ===');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Say hello in one word.' }],
    },
  });

  await collectUntil(25000);
  proc.kill();

  // Analyze
  console.log('\n=== Analysis ===');
  let foundContent = false;
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.id === 4) {
        console.log('Prompt response:', p.result?.stopReason || 'no stopReason');
        if (p.result) console.log('  result keys:', Object.keys(p.result));
        if (p.result?.content) {
          console.log('  CONTENT:', JSON.stringify(p.result.content).slice(0, 500));
          foundContent = true;
        }
      }
      if (p.method === 'session/update' && p.params?.update) {
        const upd = p.params.update;
        if (upd.content) {
          console.log('  session/update CONTENT:', JSON.stringify(upd.content).slice(0, 500));
          foundContent = true;
        }
      }
    } catch {}
  }

  if (!foundContent) {
    console.log('NO TEXT CONTENT found. Full dump:');
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const p = JSON.parse(line);
        if (p.method === 'session/update') {
          const keys = Object.keys(p.params?.update || {});
          console.log(`  update: [${keys.join(', ')}]`);
        } else if (p.id === 4) {
          console.log('  prompt result:', JSON.stringify(p).slice(0, 400));
        }
      } catch {}
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
