#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding='utf-8')
    match = re.match(r'^---\n(.*?)\n---\n', text, flags=re.DOTALL)
    if not match:
        errors.append(f'{path.relative_to(ROOT)}: missing YAML frontmatter')
        return {}
    result: dict[str, str] = {}
    current_key: str | None = None
    for line in match.group(1).splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or stripped.startswith('-'):
            continue
        if ':' not in stripped:
            if current_key and line[:1].isspace():
                result[current_key] = f"{result[current_key]} {stripped}".strip()
            continue
        key, value = stripped.split(':', 1)
        current_key = key.strip()
        result[current_key] = value.strip().strip('"\'')
    return result


for path in sorted((ROOT / '.github' / 'agents').glob('*.agent.md')):
    meta = parse_frontmatter(path)
    if not meta.get('description'):
        errors.append(f'{path.relative_to(ROOT)}: description is required')
    if meta.get('target') not in {None, '', 'vscode', 'github-copilot'}:
        errors.append(f'{path.relative_to(ROOT)}: unsupported target')

for skill_dir in sorted((ROOT / '.github' / 'skills').iterdir()):
    if not skill_dir.is_dir():
        continue
    path = skill_dir / 'SKILL.md'
    if not path.is_file():
        errors.append(f'{path.relative_to(ROOT)}: missing SKILL.md')
        continue
    meta = parse_frontmatter(path)
    if meta.get('name') != skill_dir.name:
        errors.append(f'{path.relative_to(ROOT)}: name must match directory {skill_dir.name}')
    if not meta.get('description'):
        errors.append(f'{path.relative_to(ROOT)}: description is required')

if errors:
    print('Agent customization check failed:')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('Agent customization check passed.')
