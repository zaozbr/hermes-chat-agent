// Test ACP with authenticate step and correct prompt format
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

function collectUntil(targetTimeMs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const all = stdout.split('\n').filter(Boolean);
      resolve(all);
    }, targetTimeMs);
  });
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
  const authMethods = init.result?.authMethods || [];
  console.log('Auth methods:', authMethods.map((a) => a.id).join(', '));

  // 2. Initialized
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 300));

  // 3. Authenticate with openrouter
  console.log('\n=== 2. Authenticate ===');
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'authenticate',
    params: {
      method: 'openrouter',
    },
  });
  const auth = await waitFor(2);
  console.log('Auth result:', JSON.stringify(auth).slice(0, 300));

  // 4. New session
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

  // 5. Prompt with {content: {type: 'text', text: ...}} format
  console.log('\n=== 4. Prompt ===');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ content: { type: 'text', text: 'Say hello in one word.' } }],
    },
  });

  // Collect for 25s
  const all = await collectUntil(25000);
  proc.kill();

  // Analyze messages after prompt
  console.log('\n=== Results ===');
  let foundContent = false;
  for (const line of all) {
    try {
      const p = JSON.parse(line);
      if (p.method === 'session/update' && p.params?.update) {
        const upd = p.params.update;
        const keys = Object.keys(upd);
        if (upd.content) {
          console.log('CONTENT FOUND:', JSON.stringify(upd.content).slice(0, 500));
          foundContent = true;
        }
        if (upd.message) {
          console.log('MESSAGE FOUND:', JSON.stringify(upd.message).slice(0, 500));
          foundContent = true;
        }
        if (upd.delta) {
          console.log('DELTA FOUND:', JSON.stringify(upd.delta).slice(0, 500));
          foundContent = true;
        }
        // Print update shape summary
        if (!upd.availableCommands && !upd.sessionUpdate && !upd.content && !upd.message) {
          console.log('UNKNOWN UPDATE keys:', keys, 'val:', JSON.stringify(upd).slice(0, 300));
        }
      } else if (p.id === 4) {
        console.log('PROMPT RESPONSE:', JSON.stringify(p).slice(0, 500));
      }
    } catch {}
  }

  if (!foundContent) {
    console.log('\nNO TEXT CONTENT in any response.');
    console.log('Full message summary:');
    for (const line of all) {
      try {
        const p = JSON.parse(line);
        if (p.method === 'session/update') {
          console.log(
            `  session/update: keys=${JSON.stringify(Object.keys(p.params?.update || {}))}`,
          );
        } else if (p.method) {
          console.log(`  ${p.method}`);
        } else if (p.id) {
          console.log(`  response id=${p.id}: ${p.result?.stopReason || 'has result'}`);
        }
      } catch {}
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
  process.exit(1);
});
