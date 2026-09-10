#!/usr/bin/env python3
"""Is this repository's LumbreCode baseline still current?

The same question `npm outdated` and `flutter pub outdated` answer, for the
shared engineering baseline: which version is vendored here, which is the
latest release, and what to run if they differ.

It exists because a vendored baseline has no natural reminder. An npm
dependency announces itself in every install; a directory of files copied in
once simply sits there, and the gap between it and upstream is invisible until
something breaks that was fixed centrally months ago.

Run it from the root of a consumer repository:

    python .lumbrecode/tooling/baseline/check_update.py

Exit codes: 0 when current or when the check could not reach GitHub, 1 only
with --fail-when-outdated. Being offline is not a failure -- a check that
breaks the build when a laptop is on a train teaches people to remove it.

Needs the GitHub CLI (`gh auth login`) or GITHUB_TOKEN in the environment,
because the engineering repository is private. Standard library only.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_REPO = "FlorianTim/lumbrecode-engineering"
LOCK = Path(".lumbrecode/baseline.lock.json")


def read_lock(root: Path) -> dict | None:
    path = root / LOCK
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def latest_release(repo: str) -> str | None:
    """The newest published version tag, via gh if present, else the API."""
    if shutil.which("gh"):
        result = subprocess.run(
            ["gh", "release", "list", "--repo", repo, "--limit", "20",
             "--json", "tagName", "--jq", ".[].tagName"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            return _newest(result.stdout.split())

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        return None
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases?per_page=20",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "lumbrecode-baseline-check",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    return _newest([entry.get("tag_name", "") for entry in payload])


def _newest(tags: list[str]) -> str | None:
    """Highest x.y.z tag. The moving major tag has no patch part and is skipped."""
    versions = []
    for tag in tags:
        match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", tag.strip())
        if match:
            versions.append(tuple(int(part) for part in match.groups()))
    if not versions:
        return None
    return ".".join(str(part) for part in max(versions))


def parse(version: str | None) -> tuple[int, int, int] | None:
    if not version:
        return None
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", version.strip())
    return tuple(int(p) for p in match.groups()) if match else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--profile", default=None,
                        help="Profile for the suggested command; default: the one in the lock file.")
    parser.add_argument("--fail-when-outdated", action="store_true",
                        help="Exit 1 when a newer baseline exists. For a scheduled check, not for a build.")
    args = parser.parse_args()

    root = args.root.resolve()
    lock = read_lock(root)

    if lock is None:
        print("No .lumbrecode/baseline.lock.json here.")
        print("")
        print("This repository has no vendored baseline, or it was copied in by")
        print("hand rather than applied. Adopt it once and the lock file follows:")
        print(f"  python scripts/fetch_engineering_release.py --tag <version> \\")
        print(f"      --profile <flutter|webapp|astro> --target {root.name}")
        return 0

    current = lock.get("version")
    profile = args.profile or (lock.get("profiles") or ["flutter"])[0]

    print(f"Baseline source : {lock.get('source', DEFAULT_REPO)}")
    print(f"Profile         : {profile}")
    print(f"Applied         : {lock.get('appliedAt', 'unknown')}")
    print(f"Vendored version: {current or 'unknown (applied from a local clone)'}")

    latest = latest_release(args.repo)
    if latest is None:
        print("Latest release  : could not be determined")
        print("")
        print("::notice::Skipped. Needs `gh auth login` or GITHUB_TOKEN, and network"
              " access to a private repository.")
        return 0

    print(f"Latest release  : {latest}")
    print("")

    have, want = parse(current), parse(latest)

    if have is None:
        # An unversioned apply is not "outdated", it is unknowable. Say which,
        # because the fix differs: re-apply from a release rather than chase a
        # version number that was never recorded.
        print(f"::notice::This baseline was applied without a version, so it cannot be"
              f" compared. Re-apply from release v{latest} to make it answerable.")
        print(f"  python scripts/fetch_engineering_release.py --tag v{latest} \\")
        print(f"      --profile {profile} --target .")
        return 1 if args.fail_when_outdated else 0

    if have >= want:
        print(f"::notice::Baseline is current (v{current}).")
        return 0

    print(f"::warning::A newer baseline is available: v{current} -> v{latest}")
    print("")
    print("  python scripts/fetch_engineering_release.py \\")
    print(f"      --tag v{latest} --profile {profile} --target .")
    print("")
    print("Review the diff before committing. Files you changed locally are")
    print("reported as CONFLICT and are never overwritten without --force.")
    return 1 if args.fail_when_outdated else 0


if __name__ == "__main__":
    sys.exit(main())
