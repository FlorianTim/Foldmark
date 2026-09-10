#!/usr/bin/env python3
from pathlib import Path
import re, sys
ROOT = Path(__file__).resolve().parents[1]
rules = {
    'src/domain': [r"from ['\"](?:\.\./)*application", r"from ['\"](?:\.\./)*infrastructure", r"from ['\"](?:\.\./)*presentation", r"from ['\"]vue", r"from ['\"]dexie"],
    'src/application': [r"from ['\"](?:\.\./)*presentation", r"from ['\"]vue", r"from ['\"]dexie"]
}
errors = []
for folder, patterns in rules.items():
    for file in (ROOT / folder).rglob('*.ts'):
        text = file.read_text()
        for pattern in patterns:
            if re.search(pattern, text):
                errors.append(f'{file.relative_to(ROOT)} violates architecture boundary: {pattern}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('Architecture dependency check passed.')
