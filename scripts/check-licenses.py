#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT = Path(__file__).resolve().parents[1]
policy = json.loads((ROOT / 'compliance/license-policy.json').read_text())
notice = ROOT / 'public/THIRD-PARTY-NOTICES.generated.json'
if not notice.exists():
    print('License notices not generated; run npm run licenses:generate.')
    sys.exit(1)
errors = []
review_required = []
recognized = set(policy['allowed']) | set(policy['reviewRequired'])
def resolve(expression: str) -> str:
    """An SPDX `(A OR B)` expression is satisfied by its most permissive option.

    The licensee chooses; picking an allowed alternative is that choice, made
    explicitly here rather than by a reviewer reading the notice file."""
    if ' OR ' not in expression:
        return expression
    options = [part.strip() for part in expression.strip('()').split(' OR ')]
    for option in options:
        if option in policy['allowed']:
            return option
    for option in options:
        if option in policy['reviewRequired']:
            return option
    return options[0]

for item in json.loads(notice.read_text()):
    license_name = resolve(str(item.get('license', 'UNKNOWN')))
    if license_name in policy['forbidden'] or license_name not in recognized:
        errors.append(f"{item['name']}@{item['version']}: {license_name}")
    elif license_name in policy['reviewRequired']:
        review_required.append(f"{item['name']}@{item['version']}: {license_name}")
if errors:
    print('License policy violations:\n' + '\n'.join(errors))
    sys.exit(1)
if review_required:
    print('Review-required licenses accepted by policy:\n' + '\n'.join(review_required))
print('License check passed.')
