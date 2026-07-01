import json, os

cache_path = os.path.expandvars('%LOCALAPPDATA%/hermes/models_dev_cache.json')
print('Cache path:', cache_path)

with open(cache_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Show top-level keys
print('\nTop-level keys:', list(data.keys())[:30])

# Find NVIDIA models
for key in data:
    if 'nvidia' in key.lower():
        val = data[key]
        print(f'\n=== {key} ===')
        if isinstance(val, dict) and 'models' in val:
            models = val['models']
            print(f'Models found: {len(models)}')
            for mid, minfo in models.items():
                free = minfo.get('free', minfo.get('is_free', False))
                tier = minfo.get('tier', '')
                pricing = minfo.get('pricing', minfo.get('cost', {}))
                desc = minfo.get('description', '')
                name = minfo.get('name', minfo.get('label', mid))
                family = minfo.get('family', '')
                context = minfo.get('context', minfo.get('maxTokens', ''))
                attachment = minfo.get('attachment', False)
                print(f'  {mid} | name={name} | free={free} | tier={tier} | family={family} | ctx={context} | attach={attachment} | pricing={pricing}')
                if desc:
                    print(f'    desc: {desc[:120]}')
        elif isinstance(val, list):
            print(f'List ({len(val)} models)')
            for m in val:
                model_id = m.get('id', m.get('modelId', m.get('name', '?')))
                free = m.get('free', m.get('is_free', False))
                desc = m.get('description', '')
                pricing = m.get('pricing', {})
                tier = m.get('tier', '')
                print(f'  {model_id} | free={free} | tier={tier} | pricing={pricing} | desc={desc[:80]}')
        else:
            print(f'  value: {str(val)[:200]}')
