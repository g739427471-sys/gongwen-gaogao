from app.services.deai_service import calculate_ai_score, deai_transform, BUZZWORD_BLACKLIST, CONNECTOR_BLACKLIST

text = '首先，我们要高度重视安全生产工作，切实加强组织领导。其次，不仅要大力推动隐患排查，而且要全面深化整改落实。最后，让我们一起努力，扎实有效开展安全治理。'

for k, v in BUZZWORD_BLACKLIST.items():
    count = text.count(k)
    if count > 0: print(f'  BUZZ: {k}={count}')

for k, v in CONNECTOR_BLACKLIST.items():
    count = text.count(k)
    if count > 0: print(f'  CONN: {k}={count}')

score = calculate_ai_score(text)
print(f'Score: {score["score"]} Level: {score["level"]}')
print(f'Breakdown: {score["breakdown"]}')

# Test transform
result = deai_transform(text, "natural")
score_after = calculate_ai_score(result)
print(f'After transform: {score_after["score"]}')
print(f'Text: {result[:200]}')
