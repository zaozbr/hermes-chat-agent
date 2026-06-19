/**
 * Quick test for OpenCode Zen provider
 * Requires hermes config set to use opencode provider
 */

import { spawn } from 'node:child_process';

const proc = spawn('hermes', ['acp', '--accept-hooks'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let stdout = '';
proc.stdout.on('data', (d) => {
  stdout += d.toString();
});
proc.stderr.on('data', (d) => {});

function send(m) {
  proc.stdin.write(JSON.stringify(m) + '\n');
}

function waitFor(id, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout ${timeout}ms`)), timeout);
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
      clientInfo: { name: 'opencode-test', version: '1' },
    },
  });
  const init = await waitFor(1);
  console.log('Agent:', init.result?.agentInfo?.name, init.result?.agentInfo?.version);

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
  console.log('Session:', sid?.slice(0, 16));

  // Prompt
  console.log('\nPrompting OpenCode Zen DeepSeek V4 Flash Free...');
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: sid,
      prompt: [{ type: 'text', text: 'Reply with exactly: OPencode-ZEN-OK' }],
    },
  });

  // Collect for 25s
  await new Promise((r) => setTimeout(r, 25000));
  proc.kill();

  // Analyze
  let text = '';
  let stopReason = '';
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.params?.update?.content?.text) text += p.params.update.content.text;
      if (p.result?.stopReason) stopReason = p.result.stopReason;
      if (p.result?.stop_reason) stopReason = p.result.stop_reason;
    } catch {}
  }

  if (text) {
    console.log(`\nText: "${text.slice(0, 200)}"`);
    console.log('PASS: OpenCode Zen DeepSeek V4 Flash Free');
    process.exit(0);
  } else {
    console.log('\nNo text content found');
    console.log(`Stop reason: ${stopReason || 'none'}`);

    // Show first few lines of output for debugging
    console.log('\nRaw output (first 20 lines):');
    let count = 0;
    for (const line of stdout.split('\n').filter(Boolean)) {
      if (count++ > 20) break;
      console.log(`  ${line.slice(0, 200)}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
  process.exit(1);
});
