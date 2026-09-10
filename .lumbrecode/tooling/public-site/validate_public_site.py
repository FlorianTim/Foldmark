from __future__ import annotations

import argparse
import datetime
import json
import re
import sys
from pathlib import Path

try:
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError as error:
    raise SystemExit(
        "Missing validation dependencies. Install with:\n"
        "python -m pip install PyYAML jsonschema"
    ) from error

SCRIPT = Path(__file__).resolve()

# The script lives at <root>/tooling/public-site/ here and at
# <root>/.lumbrecode/tooling/public-site/ in a consumer, so the directory that
# holds `schemas/` is two levels up in both cases. The earlier conditional
# resolved to <root>/tooling in this repository and made the validator
# unrunnable on its own templates — which is why the shipped template could
# fail the shipped schema unnoticed.
ROOT = SCRIPT.parents[2]

def _normalise_dates(value):
    """Turn YAML date/datetime scalars back into ISO strings.

    An unquoted `2026-01-01` in YAML is a `datetime.date`, but every date in
    these schemas is declared `"type": "string", "format": "date"`. Without
    this, correct-looking content fails with

        updatedAt: datetime.date(2026, 1, 1) is not of type 'string'

    and the fix — quote every date — is a rule nobody remembers and nothing
    enforces. Normalising in the one place that loads YAML is cheaper than
    asking every consumer to know it. A `datetime` still serialises with its
    time part and so still fails `format: date`, which is correct: that is a
    different value, not a formatting accident.
    """
    if isinstance(value, dict):
        return {key: _normalise_dates(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_normalise_dates(item) for item in value]
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    return value


def load_yaml(path: Path):
    return _normalise_dates(yaml.safe_load(path.read_text(encoding="utf-8")))

def schema_path(name: str) -> Path:
    candidates = [
        ROOT / "schemas" / "public-site" / "v1" / name,
        ROOT / ".lumbrecode" / "schemas" / "public-site" / "v1" / name,
        SCRIPT.parent / "schemas" / "v1" / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Schema not found: {name}")

def validate(data, schema_name: str, label: str) -> list[str]:
    schema = json.loads(schema_path(schema_name).read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return [
        f"{label}: {'/'.join(str(part) for part in error.absolute_path)}: {error.message}"
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path))
    ]

def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not match:
        raise ValueError(f"Missing YAML frontmatter: {path}")
    return yaml.safe_load(match.group(1)) or {}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("content", type=Path)
    args = parser.parse_args()
    content = args.content.resolve()

    errors: list[str] = []
    required = [
        content / "manifest.yaml",
        content / "faq/de.yaml",
        content / "faq/en.yaml",
        content / "privacy/de.md",
        content / "privacy/en.md",
        content / "roadmap.yaml",
        content / "changelog.yaml",
    ]
    for path in required:
        if not path.exists():
            errors.append(f"Missing required file: {path.relative_to(content)}")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    manifest = load_yaml(content / "manifest.yaml")
    errors += validate(manifest, "manifest.schema.json", "manifest.yaml")
    errors += validate(load_yaml(content / "faq/de.yaml"), "faq.schema.json", "faq/de.yaml")
    errors += validate(load_yaml(content / "faq/en.yaml"), "faq.schema.json", "faq/en.yaml")
    errors += validate(load_yaml(content / "roadmap.yaml"), "roadmap.schema.json", "roadmap.yaml")
    errors += validate(load_yaml(content / "changelog.yaml"), "changelog.schema.json", "changelog.yaml")

    for locale in ("de", "en"):
        metadata = frontmatter(content / f"privacy/{locale}.md")
        if metadata.get("locale") != locale:
            errors.append(f"privacy/{locale}.md: locale must be {locale}")
        if metadata.get("reviewStatus") not in {"draft", "approved", "superseded"}:
            errors.append(f"privacy/{locale}.md: invalid reviewStatus")
        if metadata.get("reviewStatus") == "approved" and not metadata.get("reviewedBy"):
            errors.append(f"privacy/{locale}.md: approved documents require reviewedBy")

    de = load_yaml(content / "faq/de.yaml")
    en = load_yaml(content / "faq/en.yaml")

    def ids(document):
        return {
            entry["id"]
            for category in document.get("categories", [])
            for entry in category.get("entries", [])
        }

    if ids(de) != ids(en):
        errors.append("FAQ IDs differ between German and English content.")

    if errors:
        print("Public-site validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Public-site content is valid: {content}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
