#!/usr/bin/env python3
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root.parent/f'{root.name}-source.zip'
excluded={'.git','node_modules','dist','coverage','playwright-report','test-results','.venv','__pycache__'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(root.rglob('*')):
    if any(part in excluded for part in p.parts) or p.is_dir() or p.suffix in {'.log','.pyc'}: continue
    z.write(p,Path(root.name)/p.relative_to(root))
print(out)
