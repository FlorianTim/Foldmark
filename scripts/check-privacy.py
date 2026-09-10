#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT = Path(__file__).resolve().parents[1]
allow = json.loads((ROOT / 'compliance/privacy-allowlist.json').read_text())
patterns = [
    r'fonts\.googleapis\.com', r'fonts\.gstatic\.com', r'googletagmanager\.com',
    r'google-analytics\.com', r'unpkg\.com', r'cdn\.jsdelivr\.net',
    r'cdnjs\.cloudflare\.com', r'hotjar\.com', r'sentry\.io', r'document\.cookie'
]
allowed = {(x['file'], x['pattern']) for x in allow.get('exceptions', [])}
violations = []
for root in [ROOT / 'src', ROOT / 'public', ROOT / 'index.html']:
    files = [root] if root.is_file() else root.rglob('*')
    for file in files:
        if not file.is_file() or file.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.ico', '.pdf'}:
            continue
        text = file.read_text(errors='ignore')
        rel = str(file.relative_to(ROOT))
        for pattern in patterns:
            if re.search(pattern, text, re.I) and (rel, pattern) not in allowed:
                violations.append(f'{rel}: forbidden remote-domain pattern {pattern}')
if violations:
    print('\n'.join(violations))
    sys.exit(1)
print('Privacy check passed: no forbidden remote assets or trackers found.')
