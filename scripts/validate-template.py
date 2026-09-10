#!/usr/bin/env python3
"""Validate configuration and synchronization of every generated identity target."""

from pathlib import Path
from html import escape
import json
import re
import sys

from template_config import (
    TemplateConfigError,
    format_html_attribute,
    load_config,
    resolve_custom_domain,
)

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    """Reports every synchronization error and exits non-zero on any mismatch."""

    errors: list[str] = []
    try:
        config = load_config(ROOT / "template.config.json")
    except TemplateConfigError as exc:
        print(f"Template validation failed:\n- {exc}")
        raise SystemExit(1) from exc

    app = config["application"]
    organization = config["organization"]
    runtime = json.loads((ROOT / "src/config/app.config.json").read_text(encoding="utf-8"))
    resolved_domain = resolve_custom_domain(app, organization)
    if runtime != {**app, "customDomain": resolved_domain, "organization": organization}:
        errors.append("runtime app config is not synchronized; run scripts/init-template.py")
    cname = ROOT / "public" / "CNAME"
    if resolved_domain and (
        not cname.is_file() or cname.read_text(encoding="utf-8").strip() != resolved_domain
    ):
        errors.append("public/CNAME is not synchronized; run scripts/init-template.py")
    if not resolved_domain and cname.exists():
        errors.append("public/CNAME must be absent when no custom domain is configured")

    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    for label, source in (("package.json", package), ("package-lock.json", lock), ("lock root", lock["packages"][""])):
        if source.get("name") != app["packageName"] or source.get("version") != app["version"]:
            errors.append(f"{label} identity is not synchronized")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    expected_fragments = [
        f'<html lang="{escape(app["defaultLocale"], quote=True)}">',
        f'<title>{escape(app["name"], quote=False)}</title>',
    ]
    for fragment in expected_fragments:
        if fragment not in index:
            errors.append(f"index.html is missing synchronized metadata: {fragment}")
    description_pattern = (
        r'<meta\s+name="description"\s+content='
        + re.escape(format_html_attribute(app["description"]))
        + r"\s*/?>"
    )
    if not re.search(description_pattern, index):
        errors.append("index.html description is not synchronized")

    if errors:
        print("Template validation failed:")
        for error in errors:
            print(f"- {error}")
        sys.exit(1)
    print("Template validation passed.")


if __name__ == "__main__":
    main()
