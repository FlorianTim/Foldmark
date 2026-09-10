#!/usr/bin/env python3
"""Create a portable static-site ZIP and SHA-256 checksum from the verified dist directory."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
RELEASE = ROOT / "release"


def main() -> None:
    """Packages deployable files at the archive root for direct web-root extraction."""

    if not (DIST / "index.html").is_file():
        raise SystemExit("dist/index.html is missing; run the verified production build first")

    config = json.loads((ROOT / "src" / "config" / "app.config.json").read_text(encoding="utf-8"))
    slug = config["slug"]
    version = config["version"]
    archive = RELEASE / f"{slug}-{version}.zip"
    checksum = archive.with_suffix(".zip.sha256")
    RELEASE.mkdir(exist_ok=True)

    manifest = {
        "application": config["name"],
        "slug": slug,
        "version": version,
        "customDomain": config["customDomain"],
        "install": "Extract every file into the HTTPS web root without renaming paths.",
    }
    deployment = (
        "STATIC RELEASE\n\n"
        "Extract all archive contents directly into an HTTPS web root. Preserve filenames and "
        "directories. Configure the response headers provided in _headers at the hosting layer; "
        "hosts that do not understand that file ignore it.\n"
    )

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(DIST.rglob("*")):
            if path.is_file():
                bundle.write(path, path.relative_to(DIST).as_posix())
        bundle.writestr("release-manifest.json", json.dumps(manifest, indent=2) + "\n")
        bundle.writestr("DEPLOYMENT.txt", deployment)

    digest = sha256(archive.read_bytes()).hexdigest()
    checksum.write_text(f"{digest}  {archive.name}\n", encoding="utf-8", newline="\n")
    print(archive.relative_to(ROOT))
    print(checksum.relative_to(ROOT))


if __name__ == "__main__":
    main()
