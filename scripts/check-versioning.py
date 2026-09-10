#!/usr/bin/env python3
"""Verify template and application versions across their authoritative files."""

from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")

template = json.loads((ROOT / "template.config.json").read_text(encoding="utf-8"))
runtime = json.loads((ROOT / "src/config/app.config.json").read_text(encoding="utf-8"))
package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
errors = []

if not SEMVER.fullmatch(version):
    errors.append("VERSION must contain exactly one semantic version")
if template["template"]["version"] != version:
    errors.append("VERSION must match template.config.json template.version")
if f"## [{version}]" not in changelog:
    errors.append("CHANGELOG.md must contain the current template version")
application_versions = {
    template["application"]["version"],
    runtime["version"],
    package["version"],
    lock["version"],
    lock["packages"][""]["version"],
}
if len(application_versions) != 1:
    errors.append("application versions differ across config, package and lock files")

if errors:
    print("Version check failed:\n- " + "\n- ".join(errors))
    sys.exit(1)
print(f"Version check passed: template {version}, application {application_versions.pop()}.")
