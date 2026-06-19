// Final ACP test with working model
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const proc = spawn('hermes', ['acp', '--accept-hooks'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, HERMES_ACCEPT_HOOKS: '1' },
});

let stdout = '';
let stderr = '';
proc.stdout.on('data', (d) => {
  stdout += d.toString();
});
proc.stderr.on('data', (d) => {
  stderr += d.toString();
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
  console.log('✅ Agent:', init.result?.agentInfo?.name, init.result?.agentInfo?.version);

  // Initialized
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 500));

  // New session
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
  console.log('✅ Session:', sid);

  // Prompt
  console.log('\n⏳ Sending prompt...');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Reply with exactly: Hello World!' }],
    },
  });

  // Collect all output for 20s
  await new Promise((r) => setTimeout(r, 20000));
  proc.kill();

  // Analyze
  console.log('\n=== Results ===');
  let foundText = false;
  let usage = null;

  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);

      // Check prompt response
      if (p.id === 4) {
        const r = p.result || {};
        console.log('stopReason:', r.stopReason);
      }

      // Check session updates
      if (p.method === 'session/update') {
        const upd = p.params?.update || {};

        // Check all possible content locations
        if (upd.delta?.text) {
          console.log('📝 delta.text:', upd.delta.text);
          foundText = true;
        }
        if (upd.content?.text) {
          console.log('📝 content.text:', upd.content.text);
          foundText = true;
        }
        if (upd.content?.type === 'text' && upd.content?.text) {
          console.log('📝 content[type=text]:', upd.content.text);
          foundText = true;
        }
        if (upd.message?.content) {
          const mc = upd.message.content;
          if (typeof mc === 'string') {
            console.log('📝 message.content:', mc);
            foundText = true;
          } else if (Array.isArray(mc)) {
            mc.forEach((c) => {
              if (c.type === 'text') {
                console.log('📝 message text:', c.text);
                foundText = true;
              }
            });
          }
        }
        if (upd.type === 'text' && upd.text) {
          console.log('📝 top-level text:', upd.text);
          foundText = true;
        }

        // Track usage
        if (upd.sessionUpdate === 'usage_update' || upd.usage) {
          usage = upd;
        }
      }
    } catch {}
  }

  console.log('\n=== Summary ===');
  console.log('Text output:', foundText ? '✅ FOUND!' : '❌ NONE');
  if (usage) console.log('Usage:', JSON.stringify(usage).slice(0, 200));

  // Show all update types for debugging
  console.log('\nAll session/update notifications:');
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.method === 'session/update') {
        const keys = Object.keys(p.params?.update || {});
        console.log(`  [${keys.join(', ')}]`);
      }
    } catch {}
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
