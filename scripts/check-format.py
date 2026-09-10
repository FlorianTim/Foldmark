#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'.git', 'node_modules', 'dist', 'coverage', 'playwright-report', 'test-results'}
TEXT_SUFFIXES = {'.ts', '.vue', '.css', '.json', '.md', '.yml', '.yaml', '.py', '.mjs', '.html', '.sh', '.ps1', '.puml', '.mmd'}
errors = []
for path in ROOT.rglob('*'):
    if path.is_dir() or any(part in EXCLUDED for part in path.parts) or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    text = path.read_text(encoding='utf-8', errors='strict')
    if text and not text.endswith('\n'):
        errors.append(f'{path.relative_to(ROOT)}: missing final newline')
    for number, line in enumerate(text.splitlines(), 1):
        if line.rstrip() != line:
            errors.append(f'{path.relative_to(ROOT)}:{number}: trailing whitespace')
if errors:
    print('Formatting hygiene check failed:')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('Formatting hygiene check passed.')
