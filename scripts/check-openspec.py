#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
required = ['app-shell','local-storage','privacy-by-default','security-baseline','theme-system','i18n','agentic-initialization','capability-system','maintainability']
errors=[f'openspec/specs/{name}.md is missing' for name in required if not (ROOT/f'openspec/specs/{name}.md').is_file()]
changes=ROOT/'openspec/changes'
if not changes.is_dir(): errors.append('openspec/changes is missing')
else:
  for folder in changes.iterdir():
    if folder.is_dir():
      for name in ['proposal.md','design.md','tasks.md']:
        if not (folder/name).is_file(): errors.append(str((folder/name).relative_to(ROOT)))
if errors:
  print('OpenSpec check failed:\n- '+'\n- '.join(errors)); sys.exit(1)
print('OpenSpec check passed.')
