#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / 'index.html').read_text()
checks = {
    'Content Security Policy': 'Content-Security-Policy' in index,
    "object-src 'none'": "object-src 'none'" in index,
    "script-src 'self'": "script-src 'self'" in index,
    'no-referrer meta': 'name="referrer"' in index,
    'robots noindex meta': 'name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"' in index,
    'robots.txt deny all': 'Disallow: /' in (ROOT / 'public/robots.txt').read_text(),
    'static host security headers': 'X-Robots-Tag: noindex' in (ROOT / 'public/_headers').read_text(),
    'CodeQL workflow': (ROOT / '.github/workflows/codeql.yml').is_file(),
    'security policy': (ROOT / 'SECURITY.md').is_file(),
    'threat model': (ROOT / 'docs/security/THREAT_MODEL.md').is_file()
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    print('Security configuration missing: ' + ', '.join(failed))
    sys.exit(1)
print('Security configuration check passed.')
