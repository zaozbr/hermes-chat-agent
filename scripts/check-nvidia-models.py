import json, os, urllib.request, ssl

cache_path = os.path.expandvars('%LOCALAPPDATA%/hermes/models_dev_cache.json')
with open(cache_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

models = data.get('nvidia', {}).get('models', {})

# Find zero-cost with tool_call
candidates = []
for mid, minfo in models.items():
    cost = minfo.get('cost', {})
    inp = cost.get('input', -1) if isinstance(cost, dict) else -1
    out = cost.get('output', -1) if isinstance(cost, dict) else -1
    if inp != 0 or out != 0:
        continue
    tc = minfo.get('tool_call', False)
    if not tc:
        continue
    if any(kw in mid.lower() for kw in ['embed', 'rerank', 'safety', 'voice', 'tts']):
        continue
    updated = minfo.get('last_updated', '')
    reas = minfo.get('reasoning', False)
    ctx = minfo.get('limit', {}).get('context', 0) if isinstance(minfo.get('limit'), dict) else 0
    name = minfo.get('name', mid)
    candidates.append((updated, mid, name, ctx, reas))

candidates.sort(key=lambda x: x[0], reverse=True)

print(f'Total zero-cost with tool_call: {len(candidates)}')
print()
print('Top 20 models (by last_updated):')
print('-' * 100)
for i, (updated, mid, name, ctx, reas) in enumerate(candidates[:20], 1):
    r = 'Y' if reas else 'N'
    print(f'{i:2}. {mid:<45} ctx={ctx:<8} reas={r} updated={updated}')

# Also check if there's a way to get active models from NVIDIA API
print()
print('Testing models against NVIDIA API...')
print()

# Get API key from hermes config
config_path = os.path.expandvars('%LOCALAPPDATA%/hermes/config.yaml')
api_key = None
try:
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            if 'api_key' in line.lower() or 'nvapi' in line:
                parts = line.split(':')
                if len(parts) >= 2:
                    api_key = parts[1].strip().strip("'\"")
                    break
except:
    pass

if not api_key:
    # Try from env
    api_key = os.environ.get('NVIDIA_API_KEY', '')

if api_key:
    # Test a few models against NVIDIA API
    test_models = [
        'qwen/qwen2.5-coder-32b-instruct',
        'minimaxai/minimax-m3',
        'meta/llama-3.3-70b-instruct',
        'meta/llama-4-maverick-17b-128e-instruct',
        'google/gemma-4-31b-it',
        'stepfun-ai/step-3.7-flash',
        'moonshotai/kimi-k2.6',
        'mistralai/mistral-large-3-675b-instruct-2512',
        'z-ai/glm-5.1',
        'qwen/qwen3.5-122b-a10b'
    ]

    for model in test_models:
        url = 'https://integrate.api.nvidia.com/v1/chat/completions'
        payload = json.dumps({
            'model': model,
            'messages': [{'role': 'user', 'content': 'Say "ok"'}],
            'max_tokens': 5
        }).encode('utf-8')

        req = urllib.request.Request(url, data=payload, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {api_key}')

        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            resp = urllib.request.urlopen(req, context=ctx, timeout=15)
            result = json.loads(resp.read().decode('utf-8'))
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            print(f'  ✅ {model:<50} response: {content[:40]}')
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8')
            detail = ''
            try:
                detail = json.loads(body).get('detail', body[:100])
            except:
                detail = body[:100]
            print(f'  ❌ {model:<50} HTTP {e.code}: {detail}')
        except Exception as e:
            print(f'  ❌ {model:<50} Error: {str(e)[:80]}')
else:
    print('No API key found. Skipping API tests.')
    print('Please update config.yaml manually.')
