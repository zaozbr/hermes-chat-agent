/**
 * Debug OpenCode Zen ACP output in detail
 */
import { spawn } from 'node:child_process';

const proc = spawn('hermes', ['acp', '--accept-hooks'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let rawLines = [];
let processedCount = 0;
proc.stdout.on('data', (d) => {
  d.toString()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => rawLines.push(line));
});

function send(m) {
  proc.stdin.write(JSON.stringify(m) + '\n');
}

function waitFor(id, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout ${timeout}ms`)), timeout);
    function check() {
      while (processedCount < rawLines.length) {
        const line = rawLines[processedCount++];
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
      clientInfo: { name: 'opencode-debug', version: '1' },
    },
  });
  const init = await waitFor(1);
  console.log('Agent:', init.result?.agentInfo?.name, init.result?.agentInfo?.version);

  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise((r) => setTimeout(r, 500));

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
  console.log('Session:', sid?.slice(0, 16));

  // Prompt with a very simple request
  console.log('\nPrompting...');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Say hello' }],
    },
  });

  // Wait for response
  await waitFor(4, 45000);
  await new Promise((r) => setTimeout(r, 1000));
  proc.kill();

  // Dump ALL response lines in detail
  console.log('\n=== RAW ACP OUTPUT ===');
  let foundText = false;

  for (const line of rawLines) {
    try {
      const p = JSON.parse(line);

      if (p.method === 'session/update') {
        const update = p.params?.update || {};
        const keys = Object.keys(update);
        const su = update.sessionUpdate || '(none)';
        const text = update.content?.text || update.delta?.text || update.text || '';
        const textType = update.content?.type || update.delta?.type || '';
        const hasText = text.length > 0;

        console.log(`\nsession/update:`);
        console.log(`  sessionUpdate: ${su}`);
        console.log(`  keys: [${keys.join(', ')}]`);

        if (update.content) {
          console.log(`  content: ${JSON.stringify(update.content).slice(0, 200)}`);
          if (update.content?.text) foundText = true;
        }
        if (update.delta) {
          console.log(`  delta: ${JSON.stringify(update.delta).slice(0, 200)}`);
        }
        if (update.message) {
          console.log(`  message: ${JSON.stringify(update.message).slice(0, 200)}`);
        }
        if (update.text) {
          console.log(`  text: ${update.text.slice(0, 100)}`);
          foundText = true;
        }
        if (hasText) {
          console.log(`  ${su}: "${text.slice(0, 100)}"`);
        }
      } else if (p.id === 4) {
        const result = p.result || {};
        console.log(`\nFinal prompt response:`);
        console.log(`  stopReason: ${result.stopReason}`);
        console.log(`  other keys: [${Object.keys(result).join(', ')}]`);

        // Check for content in the result
        if (result.content) {
          console.log(`  content: ${JSON.stringify(result.content).slice(0, 200)}`);
        }
        if (result.message) {
          console.log(`  message: ${JSON.stringify(result.message).slice(0, 200)}`);
        }
      }
    } catch {}
  }

  console.log(`\n\n${foundText ? '✅ FOUND TEXT CONTENT' : '❌ NO TEXT CONTENT FOUND'}`);

  // Check the env
  const envKey = process.env.OPENCODE_ZEN_API_KEY || '(not in env)';
  console.log(`OPENCODE_ZEN_API_KEY in env: ${envKey.slice(0, 8)}...`);

  process.exit(foundText ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
  process.exit(1);
});
