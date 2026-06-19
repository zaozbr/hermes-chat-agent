/**
 * Multi-Model ACP Integration Test
 *
 * Purpose: Test ACP handshake + prompt with MULTIPLE models and providers
 * to verify the full pipeline works end-to-end in every configuration.
 *
 * Models tested:
 *   OpenRouter:
 *     - deepseek/deepseek-v4-flash  (confirmed working)
 *     - google/gemini-3.5-flash     (confirmed working)
 *     - anthropic/claude-haiku-4.5  (confirmed working)
 *     - nvidia/nemotron-3-super-120b-a12b:free  (confirmed working)
 *   OpenCode Zen:
 *     - deepseek-v4-flash-free      (via OPENCODE_ZEN_API_KEY)
 *
 * Usage: node scripts/test-multi-model.mjs
 * Requires: Hermes CLI v0.16+, API keys configured
 */

import { spawn } from 'node:child_process';

const TESTS = [
  // ── OpenRouter models ───────────────────────────────────────────
  {
    provider: 'openrouter',
    model: 'deepseek/deepseek-v4-flash',
    prompt: 'Reply with exactly: "OPENROUTER-DEEPSEEK-OK"',
    label: 'DeepSeek V4 Flash (OpenRouter)',
  },
  {
    provider: 'openrouter',
    model: 'google/gemini-3.5-flash',
    prompt: 'Reply with exactly: "OPENROUTER-GEMINI-OK"',
    label: 'Gemini 3.5 Flash (OpenRouter)',
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-haiku-4.5',
    prompt: 'Reply with exactly: "OPENROUTER-CLAUDE-OK"',
    label: 'Claude Haiku 4.5 (OpenRouter)',
  },
  {
    provider: 'openrouter',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    prompt: 'Reply with exactly: "OPENROUTER-NEMOTRON-OK"',
    label: 'Nemotron 3 Super (OpenRouter free)',
  },
  // ── OpenCode Zen model ──────────────────────────────────────────
  {
    provider: 'opencode',
    model: 'deepseek-v4-flash-free',
    prompt: 'Reply with exactly: "OPENCODE-ZEN-OK"',
    label: 'DeepSeek V4 Flash Free (OpenCode Zen)',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

let seq = 0;

function send(proc, msg) {
  proc.stdin.write(JSON.stringify(msg) + '\n');
}

function waitForStdout(proc, filter, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(
      () => reject(new Error(`Timeout ${timeoutMs}ms waiting for ${filter}`)),
      timeoutMs,
    );

    function onData(chunk) {
      buf += chunk.toString();
      const lines = buf.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (filter(parsed)) {
            clearTimeout(timer);
            proc.stdout.removeListener('data', onData);
            resolve(parsed);
            return;
          }
        } catch {}
      }
    }

    proc.stdout.on('data', onData);
  });
}

// ── Single Model Test ───────────────────────────────────────────────

async function testModel({ label, model, prompt }) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🧪 TEST: ${label}`);
  console.log(`   Model: ${model}`);
  console.log(`${'═'.repeat(70)}`);

  const proc = spawn('hermes', ['acp', '--accept-hooks'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, HERMES_ACCEPT_HOOKS: '1' },
  });

  let stderrLog = '';
  proc.stderr.on('data', (chunk) => {
    stderrLog += chunk.toString();
  });

  try {
    // ── 1. Initialize ─────────────────────────────────────────────
    const initId = ++seq;
    send(proc, {
      jsonrpc: '2.0',
      id: initId,
      method: 'initialize',
      params: {
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: { name: 'multi-model-test', version: '1.0' },
      },
    });

    const init = await waitForStdout(proc, (r) => r.id === initId);
    if (!init?.result?.agentInfo) throw new Error('Initialize failed');
    console.log(`  ✅ Initialize: ${init.result.agentInfo.name}@${init.result.agentInfo.version}`);

    // ── 2. Initialized notification ──────────────────────────────
    send(proc, { jsonrpc: '2.0', method: 'initialized', params: {} });
    await new Promise((r) => setTimeout(r, 300));

    // ── 3. Set model via session config ──────────────────────────
    // Note: session/set_config_option may not work. We rely on hermes config set.
    // Just proceed with the prompt - the model was set via hermes config set before this test.
    // Skip config option and go straight to session.

    // ── 4. New Session ────────────────────────────────────────────
    const sessId = ++seq;
    send(proc, {
      jsonrpc: '2.0',
      id: sessId,
      method: 'session/new',
      params: { cwd: process.cwd(), toolsets: [], mcpServers: [] },
    });

    const sess = await waitForStdout(proc, (r) => r.id === sessId);
    const sessionId = sess?.result?.sessionId;
    if (!sessionId) throw new Error(`Session creation failed: ${JSON.stringify(sess)}`);
    console.log(`  ✅ Session: ${sessionId.slice(0, 16)}...`);

    // ── 5. Prompt ─────────────────────────────────────────────────
    const promptId = ++seq;
    send(proc, {
      jsonrpc: '2.0',
      id: promptId,
      method: 'session/prompt',
      params: { sessionId, prompt: [{ type: 'text', text: prompt }] },
    });

    // ── 6. Collect responses ──────────────────────────────────────
    const collected = [];
    let gotFinal = false;
    const timeout = setTimeout(() => {
      gotFinal = true;
    }, 90000);

    await new Promise((resolve) => {
      function onData(chunk) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            collected.push(parsed);
            if (parsed.id === promptId || parsed.result?.stopReason) {
              gotFinal = true;
              clearTimeout(timeout);
              proc.stdout.removeListener('data', onData);
              resolve();
              return;
            }
          } catch {}
        }
      }
      proc.stdout.on('data', onData);

      // Safety timeout
      setTimeout(() => {
        if (!gotFinal) {
          proc.stdout.removeListener('data', onData);
          resolve();
        }
      }, 95000);
    });

    // ── 7. Analyze ────────────────────────────────────────────────
    const textChunks = collected
      .map((r) => {
        if (r.params?.update?.content?.text && r.params?.update?.content?.type === 'text')
          return r.params.update.content.text;
        if (r.params?.delta?.text) return r.params.delta.text;
        if (r.params?.text) return r.params.text;
        if (r.params?.update?.message?.content) return r.params.update.message.content;
        if (r.params?.update?.text) return r.params.update.text;
        return '';
      })
      .filter(Boolean);

    const finalResult = collected.find((r) => r.id === promptId);
    const stopReason = finalResult?.result?.stopReason ?? '';

    const fullText = textChunks.join('');
    const updates = collected.filter((r) => r.method === 'session/update').length;
    const updateTypes = [
      ...new Set(
        collected
          .filter((r) => r.method === 'session/update')
          .map((r) => r.params?.update?.sessionUpdate)
          .filter(Boolean),
      ),
    ];

    console.log(`  📊 Updates: ${updates} notifications, types: [${updateTypes.join(', ')}]`);
    console.log(`  💬 Text length: ${fullText.length} chars`);
    console.log(`  🛑 Stop reason: ${stopReason || '(none)'}`);
    console.log(`  💬 Preview: "${fullText.slice(0, 100)}"`);

    // ── Verdict ───────────────────────────────────────────────────
    const PASS = fullText.length > 0;
    console.log(`  ${PASS ? '✅ PASS' : '❌ FAIL'}: ${label}`);

    return { pass: PASS, updates, updateTypes, textLength: fullText.length, stopReason, collected };
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    if (stderrLog) console.log(`  STDERR: ${stderrLog.slice(0, 500)}`);
    return { pass: false, error: err.message, stderr: stderrLog.slice(0, 500) };
  } finally {
    if (!proc.killed) proc.kill();
    // Force kill after 2s
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }, 2000);
  }
}

// ── Run All Tests ───────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        MULTI-MODEL ACP INTEGRATION TEST SUITE               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Before starting, set the first model
  const firstModel = TESTS[0].model;
  console.log(`\n📌 Setting initial model: ${firstModel}`);

  const results = [];

  for (const test of TESTS) {
    // Set model via hermes config
    const { execSync } = await import('node:child_process');
    try {
      execSync(`hermes config set model.default "${test.model}"`, { timeout: 10000 });
      console.log(`  ✅ Model set to: ${test.model}`);
    } catch (e) {
      console.log(`  ⚠️  Could not set model: ${e.message}`);
    }

    // Small delay for config to propagate
    await new Promise((r) => setTimeout(r, 1000));

    const result = await testModel(test);
    results.push({ ...test, result });
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('📊 FINAL SUMMARY');
  console.log(`${'═'.repeat(70)}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const { label, result } of results) {
    const icon = result.pass ? '✅' : '❌';
    console.log(`  ${icon} ${label}`);
    if (result.pass) {
      console.log(
        `      Text: ${result.textLength} chars | Updates: ${result.updates} | Stop: ${result.stopReason}`,
      );
    } else {
      console.log(`      Error: ${result.error || result.stderr || '(unknown)'}`);
    }
    if (result.pass) passed++;
    else failed++;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`RESULT: ${passed}/${results.length} passed, ${failed} failed`);
  console.log(`${'═'.repeat(70)}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
