import json, os, urllib.request, ssl

config_path = os.path.expandvars('%LOCALAPPDATA%/hermes/config.yaml')
env_path = os.path.expandvars('%LOCALAPPDATA%/hermes/.env')
api_key = None

# Try env file first
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('NVIDIA_API_KEY='):
                api_key = line.strip().split('=', 1)[1]
                break

if not api_key:
    api_key = os.environ.get('NVIDIA_API_KEY')

if not api_key:
    print('ERROR: No NVIDIA API key found!')
    exit(1)

print(f'API Key found: {api_key[:10]}...')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Fetch current model list from NVIDIA API
print('\n=== Buscando modelos disponíveis na NVIDIA API ===')
try:
    req = urllib.request.Request(
        'https://integrate.api.nvidia.com/v1/models',
        headers={'Authorization': f'Bearer {api_key}'},
        method='GET'
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=30)
    data = json.loads(resp.read().decode('utf-8'))

    # Save to file for later reference
    with open(os.path.expandvars('%TEMP%/nvidia-models-api.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    # NVIDIA returns data as a list directly or as {data: [...]}
    if isinstance(data, dict) and 'data' in data:
        models_list = data['data']
    elif isinstance(data, list):
        models_list = data
    else:
        models_list = [data]

    print(f'Total de modelos retornados pela API: {len(models_list)}')
    for m in models_list:
        mid = m.get('id', m.get('model', '?'))
        print(f'  - {mid}')

except Exception as e:
    print(f'Erro: {e}')

# 2. Now test specific models
print('\n=== Testando modelos candidatos contra API ===')

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
    'qwen/qwen3.5-122b-a10b',
    'qwen/qwen3.5-397b-a17b',
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    'minimaxai/minimax-m2.7',
    'stepfun-ai/step-3.5-flash',
    'microsoft/phi-4-mini-instruct',
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
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        result = json.loads(resp.read().decode('utf-8'))
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        print(f'  ✅ {model:<50} resposta: {content.strip()[:40]}')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        detail_text = 'sem detalhes'
        try:
            detail = json.loads(body)
            detail_text = detail.get('detail', detail.get('message', str(detail)[:100]))
        except:
            detail_text = body[:100]
        print(f'  ❌ {model:<50} HTTP {e.code}: {detail_text}')
    except Exception as e:
        print(f'  ❌ {model:<50} erro: {str(e)[:80]}')
