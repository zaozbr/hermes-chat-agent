import json, os, urllib.request, ssl

env_path = os.path.expandvars('%LOCALAPPDATA%/hermes/.env')
api_key = None
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('NVIDIA_API_KEY='):
                api_key = line.strip().split('=', 1)[1]
                break
if not api_key:
    api_key = os.environ.get('NVIDIA_API_KEY')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Also check pricing for these new models
new_coding_candidates = [
    'deepseek-ai/deepseek-coder-6.7b-instruct',
    'google/codegemma-1.1-7b',
    'google/codegemma-7b',
    'ibm/granite-34b-code-instruct',
    'ibm/granite-8b-code-instruct',
    'meta/codellama-70b',
    'mistralai/codestral-22b-instruct-v0.1',
    'mistralai/mistral-large',
    'mistralai/mistral-medium-3.5-128b',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'nvidia/llama-3.3-nemotron-super-49b-v1',
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-ultra-550b-a55b',
    '01-ai/yi-large',
    'zyphra/zamba2-7b-instruct',
    'stockmark/stockmark-2-100b-instruct',
    'writer/palmyra-creative-122b',
]

print('Testando modelos NOVOS da API contra a NVIDIA:')
print('=' * 80)

for model in new_coding_candidates:
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
            detail_text = detail.get('detail', detail.get('message', str(detail)[:120]))
        except:
            detail_text = body[:120]
        print(f'  ❌ {model:<50} HTTP {e.code}: {detail_text}')
    except Exception as e:
        print(f'  ❌ {model:<50} erro: {str(e)[:80]}')
