// Check exact sessionUpdate field values
import { spawn } from 'node:child_process';

const proc = spawn('hermes', ['acp', '--accept-hooks'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, HERMES_ACCEPT_HOOKS: '1' },
});

let stdout = '';
proc.stdout.on('data', (d) => {
  stdout += d.toString();
});
proc.stderr.on('data', () => {});

function send(m) {
  proc.stdin.write(JSON.stringify(m) + '\n');
}

function waitFor(id, timeout = 10000) {
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
  await waitFor(1);
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
  await waitFor(3);

  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'session/prompt',
    params: {
      sessionId: JSON.parse(stdout.split('\n').filter((l) => l.includes('sessionId'))[0]).result
        ?.sessionId,
      prompt: [{ type: 'text', text: 'Reply hello' }],
    },
  });

  await new Promise((r) => setTimeout(r, 15000));
  proc.kill();

  // Show ALL session/update notifications with sessionUpdate value
  console.log('=== session/update notifications ===');
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line);
      if (p.method === 'session/update' && p.params?.update) {
        const upd = p.params.update;
        console.log(JSON.stringify(upd, null, 2));
      }
    } catch {}
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  proc.kill();
});
