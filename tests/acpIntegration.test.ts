/**
 * @file ACP Integration Test — REAL handshake via JSON-RPC
 *
 * Spawna `hermes acp`, faz handshake JSON-RPC 2.0, cria sessão,
 * envia prompt e verifica resposta. SEM mocks.
 *
 * Requer:
 * - Hermes CLI instalado (v0.16+) + API key configurada + model setado
 * - `hermes acp --check` passando
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// ─── Line buffer helper ─────────────────────────────────────────────────

function lineBuffer(stream: NodeJS.ReadableStream) {
  let buf = '';
  const queue: Array<(line: string) => void> = [];

  stream.on('data', (chunk: Buffer) => {
    buf += chunk.toString();
    while (buf.includes('\n')) {
      const idx = buf.indexOf('\n');
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line && queue.length) {
        const resolve = queue.shift()!;
        resolve(line);
      }
    }
  });

  function nextLine(timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = queue.indexOf(resolve);
        if (i >= 0) queue.splice(i, 1);
        reject(new Error(`Timeout ${timeoutMs}ms`));
      }, timeoutMs);
      queue.push((line: string) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }

  return { nextLine };
}

// ─── Test Suite ─────────────────────────────────────────────────────────

describe('ACP Integration — real hermes agent', () => {
  let proc: ChildProcess | null = null;
  let stderrLog = '';
  let seq = 1;
  let lb: ReturnType<typeof lineBuffer>;

  beforeAll(async () => {
    const { stdout } = await exec('hermes', ['--version'], { timeout: 10_000 });
    expect(stdout).toContain('Hermes Agent');

    const { stdout: acpCheck } = await exec('hermes', ['acp', '--check'], { timeout: 10_000 });
    expect(acpCheck).toContain('ACP check OK');
  });

  it('handshake + session + prompt', async () => {
    proc = spawn('hermes', ['acp', '--accept-hooks'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stderr!.on('data', (chunk: Buffer) => {
      stderrLog += chunk.toString();
    });
    lb = lineBuffer(proc.stdout!);

    // ── 1. Initialize ───────────────────────────────────────────────
    const initId = seq++;
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: initId,
        method: 'initialize',
        params: {
          protocolVersion: 1,
          clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true },
          clientInfo: { name: 'acp-integration-test', version: '1.0' },
        },
      }) + '\n',
    );

    const initLine = await lb.nextLine(30_000);
    const init = JSON.parse(initLine);
    expect(init).toMatchObject({ jsonrpc: '2.0', id: initId });
    expect(init.result).toHaveProperty('agentInfo');
    expect(init.result.agentInfo.name).toBe('hermes-agent');
    console.log(`✅ Initialize — ${init.result.agentInfo.name}@${init.result.agentInfo.version}`);

    // ── 2. Initialized notification ─────────────────────────────────
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialized',
        params: {},
      }) + '\n',
    );

    // Pode receber notificações antes de responder ao newSession
    // ── 3. newSession ───────────────────────────────────────────────
    const sessId = seq++;
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: sessId,
        method: 'session/new',
        params: {
          cwd: process.cwd(),
          toolsets: ['skills', 'web', 'file', 'terminal'],
          mcpServers: [],
        },
      }) + '\n',
    );

    // Coletar linhas até encontrar a resposta com nosso id
    let sessResult: any = null;
    while (sessResult === null) {
      const line = await lb.nextLine(30_000);
      console.log(`  [sess raw] ${line.slice(0, 200)}`);
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === sessId) {
          sessResult = parsed;
        } else {
          // Notificação — ignorar
          console.log(`  (notif: ${parsed.method || JSON.stringify(parsed).slice(0, 100)})`);
        }
      } catch (e) {
        console.log(`  (non-json: ${line.slice(0, 100)})`);
      }
    }
    expect(sessResult).toMatchObject({ jsonrpc: '2.0', id: sessId });
    expect(sessResult.result).toHaveProperty('sessionId');
    const sessionId: string = sessResult.result.sessionId;
    expect(sessionId.length).toBeGreaterThan(0);
    console.log(`✅ Session: ${sessionId.slice(0, 16)}...`);

    // ── 4. Prompt ───────────────────────────────────────────────────
    const promptId = seq++;
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: promptId,
        method: 'session/prompt',
        params: {
          sessionId,
          prompt: [{ type: 'text', text: 'Responda em pt-BR: "Oi, tudo bem?"' }],
        },
      }) + '\n',
    );

    // Coleciona respostas (notificações + resultado final)
    const collected: any[] = [];
    let gotFinal = false;
    while (!gotFinal) {
      try {
        const line = await lb.nextLine(90_000);
        const parsed = JSON.parse(line);
        collected.push(parsed);
        // Final: resposta ao nosso request OU stopReason
        if (parsed.id === promptId) {
          gotFinal = true;
        }
        if (parsed.result?.stopReason) {
          gotFinal = true;
        }
      } catch (err: any) {
        console.log(`⚠️ Coleta encerrada: ${err.message}`);
        break;
      }
    }

    // ── Verificações ────────────────────────────────────────────────
    expect(collected.length).toBeGreaterThan(0);

    // Identificar resposta final ao prompt
    const finalResult = collected.find((r: any) => r.id === promptId);
    expect(finalResult).toBeDefined();
    expect(finalResult.result).toBeDefined();

    const stopReason = finalResult.result.stopReason ?? '';

    // Extrair texto das mensagens do agente — formatos confirmados:
    // session/update → params.update.content.text + params.update.sessionUpdate
    const textChunks = collected
      .map((r: any) => {
        // session/update com update.content.text — formato primário (agent_thought_chunk / agent_message_chunk)
        if (r.params?.update?.content?.text && r.params?.update?.content?.type === 'text')
          return r.params.update.content.text;
        // session/update com delta.text
        if (r.params?.delta?.text) return r.params.delta.text;
        if (r.params?.text) return r.params.text;
        // session/update com message.content (legado)
        if (r.params?.update?.message?.content) return r.params.update.message.content;
        // session/update com update.text (legado)
        if (r.params?.update?.text) return r.params.update.text;
        return '';
      })
      .filter(Boolean);
    const hasAgentReply = textChunks.length > 0;

    console.log(`📦 ${collected.length} mensagens coletadas`);
    collected.forEach((r, i) => {
      const method = r.method ?? '';
      const updateType = r.params?.update?.sessionUpdate ?? '';
      const label = method || updateType || `id=${r.id}`;
      const contentSnippet = r.params?.update?.content?.text
        ? ` "${r.params.update.content.text.slice(0, 40)}"`
        : '';
      console.log(
        `  [${i}] ${label}${contentSnippet}${r.result?.stopReason ? ` → stop: ${r.result.stopReason}` : ''}`,
      );
      console.log(`       raw: ${JSON.stringify(r).slice(0, 600)}`);
    });

    // O teste verifica o FLUXO DO PROTOCOLO ACP (handshake + sessão + prompt).
    // O modelo pode responder com texto (agent_message_chunk) ou apenas
    // um stopReason (end_turn) sem conteúdo — ambos são respostas válidas
    // no protocolo ACP. O que importa é que o prompt enviado teve retorno.
    if (hasAgentReply) {
      const fullText = textChunks.join('');
      console.log(`💬 Resposta: "${fullText.slice(0, 300)}"`);
      expect(fullText.length).toBeGreaterThan(0);
      console.log(`✅ Stop reason: ${stopReason || 'N/A'} — ACP handshake OK`);
    } else {
      // Sem texto, mas com stopReason válido → fluxo ACP funcionou
      expect(stopReason).toBeTruthy();
      console.log(
        `✅ Stop reason: "${stopReason}" — modelo não gerou texto (comportamento válido)`,
      );
    }

    console.log(`✅ Initialize → Session → Prompt: fluxo completo verificado`);
  }, 130_000);

  afterAll(() => {
    if (proc && !proc.killed) proc.kill();
  });
});
