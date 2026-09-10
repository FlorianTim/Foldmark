#!/usr/bin/env python3
"""Render the public-site content into the application's bundled help files.

One source, two renderings. `docs/public-site/` is authored once and is the
same content the website publishes; this tool turns it into the offline help
that ships inside the app.

Why it exists: before it, a LumbreCode app had its FAQ twice — once as
`faq/<locale>.yaml` for the site and once hand-written in the app bundle.
They drifted within one release, and the in-app copy was the one nobody
noticed was stale.

Screenshots are referenced from guides as `{{screenshot:<id>}}`. What happens
to that placeholder depends on the target:

  * `--target site` keeps it as an image, because a browser renders images.
  * `--target app` replaces it with the caption as plain text, because the
    in-app Markdown renderers deliberately do not render images — neither
    the Flutter `AppMarkdownView` nor the web `parseMarkdown` resolves
    external references, and that restriction is a security property, not an
    omission.

Either way the reference is **validated**: the id must be declared in
`screenshots.yaml`, and the image must exist for the primary profile. A guide
that points at a screenshot nobody captures fails here rather than shipping
as a broken picture.

Usage:

    python render_app_help.py --repo . --target app \\
        --out apps/mobile_app/assets/help --pattern '{document}_{locale}.md'
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as error:  # pragma: no cover - environment guard
    raise SystemExit(
        "Missing dependencies. Install with:\n  python -m pip install PyYAML jsonschema"
    ) from error

SCRIPT = Path(__file__).resolve()

SCREENSHOT_REFERENCE = re.compile(r"\{\{screenshot:([0-9]{2}-[a-z0-9-]+)\}\}")
FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def schema_path(repo: Path, family: str, name: str) -> Path:
    """Finds a schema in the engineering repo or in a consumer's synced copy."""
    candidates = [
        repo / "schemas" / family / "v1" / name,
        repo / ".lumbrecode" / "schemas" / family / "v1" / name,
        SCRIPT.parents[2] / "schemas" / family / "v1" / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise SystemExit(f"Schema not found: {family}/v1/{name}")


def validate(data: object, schema_file: Path, label: str) -> list[str]:
    """Returns one readable message per schema violation."""
    schema = json.loads(schema_file.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    return [
        f"{label}: {'/'.join(str(part) for part in error.absolute_path) or '<root>'}: "
        f"{error.message}"
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path))
    ]


def read_front_matter(text: str) -> tuple[dict, str]:
    """Splits a guide into its front matter and its body."""
    match = FRONT_MATTER.match(text)
    if not match:
        return {}, text
    return yaml.safe_load(match.group(1)) or {}, text[match.end() :]


def load_profiles(repo: Path, errors: list[str]) -> tuple[list[dict], str | None]:
    """Loads the screen profiles and returns them with the primary profile name."""
    path = repo / "docs" / "public-site" / "screenshot-profiles.json"
    if not path.exists():
        path = repo / ".lumbrecode" / "templates" / "screenshots" / "profiles.json"
    if not path.exists():
        return [], None

    data = json.loads(path.read_text(encoding="utf-8"))
    errors.extend(validate(data, schema_path(repo, "screenshots", "profiles.schema.json"), path.name))
    profiles = data.get("profiles", [])
    primary = next((p["name"] for p in profiles if p.get("primary")), None)
    if primary is None and profiles:
        primary = profiles[0]["name"]
    return profiles, primary


def load_manifest(repo: Path, errors: list[str]) -> dict[str, dict]:
    """Loads the declared screenshots, keyed by id."""
    path = repo / "docs" / "public-site" / "screenshots.yaml"
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    errors.extend(
        validate(data, schema_path(repo, "screenshots", "manifest.schema.json"), path.name)
    )
    return {shot["id"]: shot for shot in data.get("shots", [])}


def resolve_screenshots(
    body: str,
    *,
    locale: str,
    target: str,
    repo: Path,
    manifest: dict[str, dict],
    primary_profile: str | None,
    source_label: str,
    errors: list[str],
    warnings: list[str],
) -> str:
    """Replaces every `{{screenshot:id}}` and reports the ones that cannot be kept."""

    def replace(match: re.Match[str]) -> str:
        shot_id = match.group(1)
        shot = manifest.get(shot_id)
        if shot is None:
            errors.append(
                f"{source_label}: references screenshot '{shot_id}', "
                f"which is not declared in docs/public-site/screenshots.yaml"
            )
            return ""

        caption = shot["caption"].get(locale) or next(iter(shot["caption"].values()))

        profiles = shot.get("profiles") or ([primary_profile] if primary_profile else [])
        profile = primary_profile if primary_profile in profiles else (profiles[0] if profiles else None)
        if profile is None:
            errors.append(f"{source_label}: screenshot '{shot_id}' has no usable profile")
            return caption

        image = repo / "design" / "screenshots" / profile / f"{shot_id}.png"
        if not image.exists():
            message = (
                f"{source_label}: screenshot '{shot_id}' is declared but "
                f"{image.relative_to(repo).as_posix()} does not exist — run the capture flow"
            )
            (warnings if shot.get("optional") else errors).append(message)
            if not shot.get("optional"):
                return caption

        if target == "site":
            relative = f"../../../design/screenshots/{profile}/{shot_id}.png"
            return f"![{caption}]({relative})"
        # In-app renderers do not resolve images; the caption carries the meaning.
        return caption

    return SCREENSHOT_REFERENCE.sub(replace, body)


def render_manual(
    repo: Path, locale: str, target: str, manifest: dict, primary: str | None,
    errors: list[str], warnings: list[str],
) -> str | None:
    """Assembles the guides of one locale into a single manual, in `order`."""
    directory = repo / "docs" / "public-site" / "guides" / locale
    if not directory.is_dir():
        return None

    guides = []
    for path in sorted(directory.glob("*.md")):
        meta, body = read_front_matter(path.read_text(encoding="utf-8"))
        if meta.get("locale") not in (None, locale):
            errors.append(
                f"{path.name}: front matter says locale '{meta.get('locale')}' "
                f"but the file sits under guides/{locale}/"
            )
        guides.append((meta.get("order", 1000), path.name, body.strip()))

    if not guides:
        return None

    parts = []
    for _, name, body in sorted(guides):
        parts.append(
            resolve_screenshots(
                body,
                locale=locale,
                target=target,
                repo=repo,
                manifest=manifest,
                primary_profile=primary,
                source_label=f"guides/{locale}/{name}",
                errors=errors,
                warnings=warnings,
            )
        )
    return "\n\n".join(parts) + "\n"


def render_faq(
    repo: Path, locale: str, target: str, manifest: dict, primary: str | None,
    errors: list[str], warnings: list[str],
) -> str | None:
    """Renders one locale's FAQ as Markdown, category by category."""
    path = repo / "docs" / "public-site" / "faq" / f"{locale}.yaml"
    if not path.exists():
        return None

    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    errors.extend(validate(data, schema_path(repo, "public-site", "faq.schema.json"), path.name))
    if data.get("locale") not in (None, locale):
        errors.append(f"{path.name}: declares locale '{data.get('locale')}'")

    lines: list[str] = []
    for category in data.get("categories", []):
        lines.append(f"# {category['title']}")
        lines.append("")
        for entry in category.get("entries", []):
            lines.append(f"## {entry['question']}")
            lines.append("")
            answer = resolve_screenshots(
                entry["answerMarkdown"].strip(),
                locale=locale,
                target=target,
                repo=repo,
                manifest=manifest,
                primary_profile=primary,
                source_label=f"faq/{locale}.yaml:{entry['id']}",
                errors=errors,
                warnings=warnings,
            )
            lines.append(answer)
            lines.append("")
    return "\n".join(lines).rstrip() + "\n" if lines else None


GENERATED_NOTE = {
    "de": "<!-- Generiert aus docs/public-site/. Nicht direkt bearbeiten. -->",
    "en": "<!-- Generated from docs/public-site/. Do not edit directly. -->",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=".", help="Consumer repository root.")
    parser.add_argument("--out", required=True, help="Directory the help files are written to.")
    parser.add_argument("--locales", default="de,en", help="Comma-separated locales to render.")
    parser.add_argument(
        "--target",
        choices=("app", "site"),
        default="app",
        help="'app' drops images and keeps captions; 'site' keeps images.",
    )
    parser.add_argument(
        "--pattern",
        default="{document}.{locale}.md",
        help="Output file name. Flutter repositories pass '{document}_{locale}.md'.",
    )
    parser.add_argument("--check", action="store_true", help="Fail if the output is not up to date.")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    out = repo / args.out
    errors: list[str] = []
    warnings: list[str] = []

    profiles, primary = load_profiles(repo, errors)
    manifest = load_manifest(repo, errors)

    # Everything is rendered before anything is written: a run that found a
    # problem must not leave half-updated help files behind, because the next
    # `--check` would then pass on content nobody approved.
    rendered: dict[Path, str] = {}
    for locale in [item.strip() for item in args.locales.split(",") if item.strip()]:
        documents = {
            "manual": render_manual(repo, locale, args.target, manifest, primary, errors, warnings),
            "faq": render_faq(repo, locale, args.target, manifest, primary, errors, warnings),
        }
        for document, content in documents.items():
            if content is None:
                continue
            note = GENERATED_NOTE.get(locale, GENERATED_NOTE["en"])
            target_file = out / args.pattern.format(document=document, locale=locale)
            rendered[target_file] = f"{note}\n\n{content}"

    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)

    if errors:
        print("Help rendering failed; nothing was written:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    written: list[str] = []
    stale: list[str] = []
    for target_file, content in rendered.items():
        relative = target_file.relative_to(repo).as_posix()
        if args.check:
            current = target_file.read_text(encoding="utf-8") if target_file.exists() else None
            if current != content:
                stale.append(relative)
            continue
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(content, encoding="utf-8", newline="\n")
        written.append(relative)

    if stale:
        print("Bundled help is out of date. Re-run without --check:", file=sys.stderr)
        for item in stale:
            print(f"- {item}", file=sys.stderr)
        return 1

    if args.check:
        print(f"Bundled help is up to date ({len(profiles)} screen profiles declared).")
    else:
        print(f"Rendered {len(written)} help files into {out.relative_to(repo).as_posix()}.")
        for item in written:
            print(f"- {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
