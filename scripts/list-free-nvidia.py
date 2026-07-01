import json, os

cache_path = os.path.expandvars('%LOCALAPPDATA%/hermes/models_dev_cache.json')

with open(cache_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

models = data.get('nvidia', {}).get('models', {})

print(f'Total de modelos NVIDIA NIM no cache: {len(models)}\n')

# Find all zero-cost models
zero_cost = []
for mid, minfo in models.items():
    cost = minfo.get('cost', {})
    inp = cost.get('input', -1) if isinstance(cost, dict) else -1
    out = cost.get('output', -1) if isinstance(cost, dict) else -1

    if inp == 0 and out == 0:
        name = minfo.get('name', mid)
        tc = minfo.get('tool_call', False)
        reas = minfo.get('reasoning', False)
        ctx = minfo.get('limit', {}).get('context', '?') if isinstance(minfo.get('limit'), dict) else '?'
        family = minfo.get('family', '')
        mod_input = minfo.get('modalities', {}).get('input', [])
        mod_output = minfo.get('modalities', {}).get('output', [])
        release = minfo.get('release_date', '')

        # Score for development suitability
        score = 0
        if tc: score += 5  # tool calling is essential for ACP
        if reas: score += 3  # reasoning helps complex tasks
        if isinstance(ctx, int):
            if ctx >= 1000000: score += 5
            elif ctx >= 128000: score += 3
            elif ctx >= 32000: score += 1
        if 'coder' in mid.lower(): score += 10  # coding-specific model
        if 'qwen3' in mid.lower(): score += 3
        if '480b' in mid.lower() or '675b' in mid.lower(): score += 2  # large params

        # Determine if this is a chat model (not embedding, vision-only, audio, etc)
        is_chat = tc or ('text' in mod_input and 'text' in mod_output)
        if not is_chat and any(kw in mid.lower() for kw in ['bge', 'embed', 'rerank', 'whisper', 'magpie', 'tts', 'cosmos', 'detect', 'segment', 'paligemma', 'glider', 'sparsedrive', 'usdcode', 'usdvalidate', 'studiovoice']):
            continue  # skip non-chat models

        # Skip image-only models (no chat)
        if mod_input == ['text', 'image'] and not tc:
            continue  # vision-only no tool_call

        # Skip audio/speech models
        if any(kw in mid.lower() for kw in ['voice', 'tts', 'whisper', 'riva']):
            continue

        # Skip safety/content models
        if any(kw in mid.lower() for kw in ['safety', 'guard', 'content-safety']):
            continue

        zero_cost.append((score, mid, name, tc, reas, ctx, family, release))

zero_cost.sort(key=lambda x: x[0], reverse=True)

print(f"{'#':<4} {'Modelo':<55} {'Nome':<33} {'Tool':<6} {'Reas':<6} {'Contexto':<10}")
print('=' * 120)
for i, (score, mid, name, tc, reas, ctx, family, release) in enumerate(zero_cost, 1):
    star = '⭐' if score >= 15 else ('✅' if score >= 8 else ('  ' if score >= 3 else '   '))
    tc_str = '✅' if tc else '✗'
    reas_str = '✅' if reas else '✗'
    ctx_str = str(ctx) if ctx != '?' else '?'
    print(f"{star} {i:<2} {mid:<53} {name:<31} {tc_str:<6} {reas_str:<6} {ctx_str:<10}")
