import { fetch } from "undici";

const FREE_MODELS = [
  // OpenCode Zen (OpenAI Chat Completion) - requires API key
  { provider: "OpenCode Zen", baseUrl: "https://opencode.ai/zen", models: [
    { id: "mimo-v2.5-free", name: "[FREE] Mimo V2.5 Free" },
    { id: "nemotron-3-ultra-free", name: "[FREE] Nemotron 3 Ultra Free" },
    { id: "north-mini-code-free", name: "[FREE] North Mini Code Free" },
    { id: "deepseek-v4-pro", name: "[FREE] DeepSeek V4 Pro" },
    { id: "qwen3.6-plus-free", name: "[FREE] Qwen3.6 Plus Free" },
    { id: "minimax-m3-free", name: "[FREE] MiniMax-M3 Free" }
  ], auth: "api-key", apiKey: "$UCPSECRET:10e140fa-9f6f-4734-a49d-21fc8c01c895$" },

  // DeepSeek V4 Flash Free - no auth
  { provider: "DeepSeek V4 Flash Free", baseUrl: "https://opencode.ai/zen", models: [
    { id: "deepseek-v4-flash-free", name: "[FREE] DeepSeek V4 Flash Free" }
  ], auth: "none" },

  // OpenCode Zen (Anthropic) - requires API key
  { provider: "OpenCode Zen (Anthropic)", baseUrl: "https://opencode.ai/zen", models: [
    { id: "minimax-m2.1-free", name: "[FREE] MiniMax-M2.1 Free" }
  ], auth: "api-key", apiKey: "$UCPSECRET:75ea19d0-843d-4756-9835-fffed3573c34$" },

  // OpenRouter - requires API key
  { provider: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", models: [
    { id: "openrouter/free", name: "[FREE] Free Models Router" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "[FREE] Meta Llama 3.3 70B Instruct" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", name: "[FREE] Meta Llama 3.2 3B Instruct" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "[FREE] Nous Hermes 3 405B Instruct" },
    { id: "qwen/qwen3-coder:free", name: "[FREE] Qwen3 Coder 480B A35B" },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "[FREE] Qwen3 Next 80B A3B Instruct" },
    { id: "openai/gpt-oss-120b:free", name: "[FREE] OpenAI GPT-OSS 120B" },
    { id: "openai/gpt-oss-20b:free", name: "[FREE] OpenAI GPT-OSS 20B" },
    { id: "google/gemma-4-31b-it:free", name: "[FREE] Google Gemma 4 31B" },
    { id: "google/gemma-4-26b-a4b-it:free", name: "[FREE] Google Gemma 4 26B A4B" },
    { id: "google/lyria-3-pro-preview", name: "[FREE] Google Lyria 3 Pro Preview" },
    { id: "google/lyria-3-clip-preview", name: "[FREE] Google Lyria 3 Clip Preview" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "[FREE] NVIDIA Nemotron 3 Ultra" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "[FREE] NVIDIA Nemotron 3 Super" },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "[FREE] NVIDIA Nemotron 3 Nano 30B A3B" },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "[FREE] NVIDIA Nemotron 3 Nano Omni Reasoning" },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "[FREE] NVIDIA Nemotron Nano 12B V2 VL" },
    { id: "nvidia/nemotron-nano-9b-v2:free", name: "[FREE] NVIDIA Nemotron Nano 9B V2" },
    { id: "nvidia/nemotron-3.5-content-safety:free", name: "[FREE] NVIDIA Nemotron 3.5 Content Safety" },
    { id: "liquid/lfm-2.5-1.2b-thinking:free", name: "[FREE] Liquid LFM2.5 1.2B Thinking" },
    { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "[FREE] Liquid LFM2.5 1.2B Instruct" },
    { id: "poolside/laguna-xs.2:free", name: "[FREE] Poolside Laguna XS.2" },
    { id: "poolside/laguna-m.1:free", name: "[FREE] Poolside Laguna M.1" },
    { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name: "[FREE] Venice Uncensored (Dolphin Mistral 24B)" },
    { id: "nex-agi/nex-n2-pro:free", name: "[FREE] Nex AGI Nex-N2-Pro" },
    { id: "openrouter/owl-alpha", name: "[FREE] OpenRouter Owl Alpha" }
  ], auth: "api-key", apiKey: "$UCPSECRET:15df5fde-96b0-4ec5-8b82-f3e66eeb1121$" }
];

const TEST_MESSAGE = "Olá! Responda apenas 'OK' para confirmar que está funcionando.";
const TIMEOUT_MS = 120000; // 2 minutes

async function testModel(provider: string, baseUrl: string, model: { id: string, name: string }, auth: string, apiKey?: string): Promise<{ success: boolean; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth === "api-key" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: TEST_MESSAGE }],
        max_tokens: 50,
        temperature: 0.1,
        stream: false
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, latency, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    return { success: true, latency, error: content.includes("OK") ? undefined : `Unexpected response: ${content.substring(0, 100)}` };
  } catch (error) {
    const latency = Date.now() - startTime;
    return { success: false, latency, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log(`Testing ${FREE_MODELS.reduce((sum, p) => sum + p.models.length, 0)} FREE models...\n`);
  
  const results: Array<{ provider: string; model: string; success: boolean; latency: number; error?: string }> = [];
  
  for (const providerConfig of FREE_MODELS) {
    for (const model of providerConfig.models) {
      console.log(`Testing: ${providerConfig.provider} / ${model.name}...`);
      
      const result = await testModel(
        providerConfig.provider,
        providerConfig.baseUrl,
        model,
        providerConfig.auth,
        providerConfig.apiKey
      );
      
      results.push({
        provider: providerConfig.provider,
        model: model.name,
        success: result.success,
        latency: result.latency,
        error: result.error
      });
      
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status} (${result.latency}ms)${result.error ? ` - ${result.error}` : ""}`);
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("");
  
  for (const r of results) {
    const status = r.success ? "✅" : "❌";
    console.log(`${status} ${r.provider} / ${r.model} (${r.latency}ms)${r.error ? ` - ${r.error}` : ""}`);
  }
  
  // Save results to file
  const fs = await import("fs");
  fs.writeFileSync("free-models-test-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to free-models-test-results.json");
}

main().catch(console.error);