#!/usr/bin/env python3
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
adr_dir = root / "docs" / "adr"
errors = []

required_files = [
    root / "docs" / "copilot" / "MASTER_PROMPT.md",
    root / "docs" / "security" / "THREAT_MODEL.md",
    root / "docs" / "security" / "OWASP_TOP10_2025_MAPPING.md",
    root / "docs" / "security" / "ASVS_5_BASELINE.md",
    root / "docs" / "development" / "SOURCE_CODE.md",
    root / "docs" / "compliance" / "EU_PRIVACY_ACCESSIBILITY_BASELINE.md",
    root / "docs" / "deployment" / "STATIC_RELEASES.md",
    root / "docs" / "dependencies" / "UPDATE_WORKFLOW.md",
    root / "docs" / "security" / "CRAWLER_AND_ACCESS_CONTROL.md",
    root / "docs" / "product" / "requirements_roadmap.md",
    root / "docs" / "template-feedback" / "README.md",
    root / "docs" / "support" / "CONTACT_CHANNELS.md",
    root / "PRIVACY.md",
    root / "SECURITY.md",
    root / "VERSION",
    root / "CHANGELOG.md",
    root / "openspec" / "project.md",
]
for required in required_files:
    if not required.is_file():
        errors.append(f"{required}: required documentation file is missing")

for adr in sorted(adr_dir.glob("*.md")):
    if adr.name in {"README.md", "template.md"}:
        continue
    content = adr.read_text(encoding="utf-8")
    if not re.search(r"^## Status\n", content, flags=re.MULTILINE):
        errors.append(f"{adr}: missing '## Status'")
    if not re.search(r"^Date:\s*\d{4}-\d{2}-\d{2}", content, flags=re.MULTILINE):
        errors.append(f"{adr}: missing 'Date: YYYY-MM-DD'")

export_pattern = re.compile(r"^export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|class|function|interface|type)\b")
for source in sorted((root / "src").rglob("*.ts")):
    lines = source.read_text(encoding="utf-8").splitlines()
    for index, line in enumerate(lines):
        if not export_pattern.match(line):
            continue
        previous = index - 1
        while previous >= 0 and not lines[previous].strip():
            previous -= 1
        if previous < 0 or not lines[previous].strip().endswith("*/"):
            errors.append(
                f"{source.relative_to(root)}:{index + 1}: exported declaration requires TSDoc"
            )

if errors:
    print("Documentation check failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Documentation check passed")
