// Dump raw ACP messages to diagnose empty agent response
import { spawn } from 'node:child_process';

const proc = spawn('hermes', ['acp', '--accept-hooks'], { stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';

proc.stdout.on('data', (d) => {
  stdout += d.toString();
});
proc.stderr.on('data', (d) => {
  /* stderr noise */
});

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
  // Initialize
  console.log('--- STEP 1: Initialize ---');
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: 1,
      clientCapabilities: {},
      clientInfo: { name: 'dump-test', version: '1' },
    },
  });
  const init = await waitFor(1);
  console.log('Agent:', init.result?.agentInfo?.name, '@', init.result?.agentInfo?.version);

  // Initialized notification
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 500));

  // New session
  console.log('\n--- STEP 2: session/new ---');
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'session/new',
    params: {
      cwd: process.cwd(),
      toolsets: ['web'],
      mcpServers: [],
    },
  });
  const sess = await waitFor(2);
  const sid = sess.result?.sessionId;
  console.log('Session:', sid);
  // dump full session response
  console.log('Session raw result keys:', Object.keys(sess.result || {}));

  // Prompt
  console.log('\n--- STEP 3: session/prompt ---');
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Say "hello" and nothing else.' }],
    },
  });

  // Wait for response
  await new Promise((r) => setTimeout(r, 25000));
  proc.kill();

  // Print ALL messages after init
  console.log('\n--- ALL MESSAGES ---');
  const all = stdout.split('\n').filter(Boolean);
  for (const line of all) {
    try {
      const p = JSON.parse(line);
      const method = p.method || '';
      const id = p.id || '';
      const isNotif = !p.id;
      if (method === 'session/update') {
        const keys = Object.keys(p.params?.update || {});
        console.log(`[session/update] keys=${JSON.stringify(keys)}`);
        // Print the full update for inspection
        const upd = p.params?.update;
        if (upd?.message) console.log('  message:', JSON.stringify(upd.message).slice(0, 1000));
        if (upd?.text) console.log('  text:', upd.text.slice(0, 500));
        if (upd?.content) console.log('  content:', JSON.stringify(upd.content).slice(0, 500));
        if (upd?.delta) console.log('  delta:', JSON.stringify(upd.delta).slice(0, 500));
        // Print availableCommands if present
        if (upd?.availableCommands) {
          console.log('  availableCommands:', JSON.stringify(upd.availableCommands).slice(0, 500));
        }
        // Print full update for anything unknown
        if (
          !upd?.message &&
          !upd?.text &&
          !upd?.content &&
          !upd?.delta &&
          !upd?.availableCommands &&
          !upd?.sessionUpdate
        ) {
          console.log('  FULL update:', JSON.stringify(upd).slice(0, 1000));
        }
        if (upd?.sessionUpdate) {
          console.log(`  sessionUpdate: ${upd.sessionUpdate} size=${upd.size} used=${upd.used}`);
        }
      } else if (isNotif) {
        console.log(`[NOTIF] method=${method}`);
      } else {
        console.log(`[RESP] id=${id} stopReason=${p.result?.stopReason || 'none'}`);
        if (p.result && !p.result.stopReason) {
          console.log('  FULL result keys:', Object.keys(p.result));
          console.log('  FULL:', JSON.stringify(p).slice(0, 1000));
        }
      }
    } catch {
      console.log('[raw]', line.slice(0, 300));
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
  process.exit(1);
});
