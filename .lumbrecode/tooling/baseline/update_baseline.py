#!/usr/bin/env python3
"""Bring this repository's LumbreCode baseline to the newest release.

`check_update.py` answers "am I current?" and prints a command. This runs it.
One step instead of three, and no version number to look up and mistype:

    python .lumbrecode/tooling/baseline/update_baseline.py

It resolves the newest published release, downloads that release's bundle,
and applies it with the profile the lock file already records. When the
baseline is current it does nothing and says so, so it is safe to run from a
setup script or an initializer that cannot know the answer in advance.

Why it downloads a release rather than copying from a sibling clone: the
release asset is immutable and carries its version, so `baseline.lock.json`
records something a later check can compare against. An apply from a working
clone records `null`, and an update check that compares against a version
nobody published is worse than no check at all.

Needs the GitHub CLI (`gh auth login`), because the engineering repository is
private. Standard library otherwise.

Exit codes: 0 when the baseline was updated or was already current, 1 when
the update could not be carried out.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

# Delivered side by side, so this import works when the script is run from the
# repository root as `python .lumbrecode/tooling/baseline/update_baseline.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_update import DEFAULT_REPO, latest_release, parse, read_lock  # noqa: E402

VALID_PROFILES = {"common", "flutter", "webapp", "astro", "all"}


def resolve_profile(lock: dict | None, override: str | None) -> str | None:
    """Which profile to apply.

    The lock file records the set that was applied. Re-applying with a
    different set makes `apply_baseline.py` refuse to retire files the
    baseline no longer delivers, so the recorded set is the right default and
    an override is something to be deliberate about.
    """
    if override:
        return override
    profiles = (lock or {}).get("profiles") or []
    if len(profiles) == 1:
        return profiles[0]
    if len(profiles) > 1:
        # More than one recorded set cannot be expressed as a single --profile
        # value; "all" is the only faithful choice.
        return "all"
    return None


def run(command: list[str], cwd: Path | None = None) -> int:
    return subprocess.run(command, cwd=cwd).returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--target", type=Path, default=Path("."),
                        help="Repository to update. Default: the working directory.")
    parser.add_argument("--profile", default=None,
                        help="Override the profile from the lock file. Needed on a first adoption.")
    parser.add_argument("--force", action="store_true",
                        help="Re-apply even when the baseline is already current.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Resolve and report, download and change nothing.")
    args = parser.parse_args()

    target = args.target.resolve()

    if shutil.which("gh") is None:
        print("::error::The GitHub CLI is required. Install it and run `gh auth login`.")
        return 1

    lock = read_lock(target)
    current = (lock or {}).get("version")
    profile = resolve_profile(lock, args.profile)

    if profile is None:
        print("::error::No baseline in this repository and no --profile given.")
        print("")
        print("A first adoption has to say which profile to apply:")
        print(f"  python {Path(__file__).name} --profile <flutter|webapp|astro>")
        return 1
    if profile not in VALID_PROFILES:
        print(f"::error::Unknown profile {profile!r}. One of: {', '.join(sorted(VALID_PROFILES))}")
        return 1

    latest = latest_release(args.repo)
    if latest is None:
        print("::error::Could not determine the latest release.")
        print("Needs `gh auth login` and network access to a private repository.")
        return 1

    print(f"Repository      : {target}")
    print(f"Profile         : {profile}")
    print(f"Vendored version: {current or 'none'}")
    print(f"Latest release  : {latest}")
    print("")

    have, want = parse(current), parse(latest)
    if have is not None and want is not None and have >= want and not args.force:
        print(f"::notice::Baseline is current (v{current}). Nothing to do.")
        return 0

    if args.dry_run:
        print(f"Would apply v{latest} with profile {profile}.")
        return 0

    asset = f"lumbrecode-baseline-v{latest}.zip"
    with tempfile.TemporaryDirectory(prefix="lumbrecode-baseline-") as name:
        temp = Path(name)
        if run(["gh", "release", "download", f"v{latest}", "--repo", args.repo,
                "--pattern", asset, "--dir", str(temp)]) != 0:
            print(f"::error::Could not download {asset} from {args.repo}.")
            return 1

        extracted = temp / "engineering"
        extracted.mkdir()
        with zipfile.ZipFile(temp / asset) as archive:
            archive.extractall(extracted)

        scripts = list(extracted.glob("*/scripts/apply_baseline.py"))
        if len(scripts) != 1:
            print("::error::Unexpected bundle structure; found "
                  f"{len(scripts)} apply_baseline.py.")
            return 1

        code = run([sys.executable, str(scripts[0]),
                    "--profile", profile, "--target", str(target), "--apply"])
        if code != 0:
            print("::error::Applying the baseline failed.")
            return code

    print("")
    print(f"::notice::Baseline updated to v{latest}.")
    print("Review the diff before committing. A file you changed locally is")
    print("reported as CONFLICT and is never overwritten; a file the baseline")
    print("no longer delivers is REMOVE when untouched and ORPHAN when edited.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
