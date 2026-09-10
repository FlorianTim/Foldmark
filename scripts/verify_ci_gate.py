#!/usr/bin/env python3
"""Verify that a gating workflow actually produced a result for this PR.

Why this exists
---------------
A workflow that fails to *start* produces no check run at all. In flutter-app-template PR #24 a
call to a reusable workflow could not be resolved: the run failed after zero
seconds with zero jobs, GitHub attached no check to the pull request, and the
PR reported MERGEABLE / CLEAN. The gate had never run and nothing said so.

Branch protection would catch that, but it needs GitHub Pro or a public
repository. This script is the free substitute: it runs on every pull request,
without path filters, and turns a silently missing gate into a red check.

What it does NOT do: block a merge. Nothing can, without branch protection.
It makes the failure visible; acting on it is still a human decision.

What it checks
--------------
1. Should the gated workflow have run for this PR? The answer comes from the
   workflow file itself -- its ``on.pull_request.paths`` -- so there is one
   source of truth and no second copy to drift.
2. If it should not have run, pass and say why.
3. If it should have run, wait briefly for its run to appear, then:
   - no run at all             -> fail
   - run concluded, not success -> fail
   - run still going            -> pass

Point three is deliberate. Every *invisible* failure mode is fast: a workflow
that cannot load fails within seconds, and a run that is never created never
appears. A gate that fails five minutes in is already visible as a red check
and needs no help from this script. So a short wait is enough, and the job
costs a fraction of what polling to completion would.

Usage
-----
    python scripts/automation/ci/verify_ci_gate.py \
        --repo OWNER/NAME --pr 42 --head-sha <sha> \
        --workflow ci-mobile.yml

Reads GITHUB_TOKEN from the environment. Standard library only, in line with
the rest of scripts/automation/.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API = "https://api.github.com"


# --------------------------------------------------------------------------
# GitHub API
# --------------------------------------------------------------------------


def api(path: str, token: str) -> dict:
    """GET one API path and return the decoded body."""
    request = urllib.request.Request(
        f"{API}{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "lumbrecode-ci-gate",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:  # noqa: PERF203 - one call, one error
        body = error.read().decode("utf-8", "replace")[:400]
        raise SystemExit(f"::error::GitHub API {error.code} on {path}: {body}")


def changed_files(repo: str, pr: int, token: str) -> list[str]:
    """Every file the pull request touches, across all pages."""
    files: list[str] = []
    page = 1
    while True:
        batch = api(f"/repos/{repo}/pulls/{pr}/files?per_page=100&page={page}", token)
        if not batch:
            break
        files.extend(entry["filename"] for entry in batch)
        if len(batch) < 100:
            break
        page += 1
        if page > 30:  # 3000 files; GitHub stops paginating here anyway
            break
    return files


def workflow_runs(repo: str, workflow: str, head_sha: str, token: str) -> list[dict]:
    """Runs of one workflow for one head commit."""
    payload = api(
        f"/repos/{repo}/actions/workflows/{workflow}/runs"
        f"?head_sha={head_sha}&per_page=20",
        token,
    )
    return payload.get("workflow_runs", [])


def job_count(repo: str, run_id: int, token: str) -> int:
    payload = api(f"/repos/{repo}/actions/runs/{run_id}/jobs?per_page=1", token)
    return int(payload.get("total_count", 0))


# --------------------------------------------------------------------------
# Reading the trigger out of the workflow file
# --------------------------------------------------------------------------


def parse_pull_request_paths(text: str) -> list[str]:
    """Extract ``on.pull_request.paths`` from a workflow file.

    A deliberately small reader rather than a YAML dependency: everything else
    under scripts/automation/ is standard library only, and this needs one
    list out of one file whose shape we own.

    It is strict on purpose. If it cannot find the block it raises, and the
    caller turns that into a failed check -- a guard that silently decides
    "nothing to check" is worse than no guard at all.
    """
    lines = text.splitlines()

    def indent_of(line: str) -> int:
        return len(line) - len(line.lstrip(" "))

    # `on:` at column 0. Quoted forms are valid YAML and appear in the wild.
    start = None
    for index, line in enumerate(lines):
        if re.match(r'^(on|"on"|\'on\'):\s*$', line):
            start = index + 1
            break
    if start is None:
        raise ValueError("no top-level `on:` block")

    # `pull_request:` inside it.
    pr_start = None
    pr_indent = None
    for index in range(start, len(lines)):
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if indent_of(line) == 0:
            break  # left the `on:` block
        if re.match(r"^\s*pull_request:\s*$", line):
            pr_start = index + 1
            pr_indent = indent_of(line)
            break
    if pr_start is None:
        raise ValueError("no `pull_request:` under `on:`")

    # `paths:` inside that, then its list items.
    paths: list[str] = []
    in_paths = False
    for index in range(pr_start, len(lines)):
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        current = indent_of(line)
        if current <= pr_indent:
            break  # left the `pull_request:` block
        if re.match(r"^\s*paths:\s*$", line):
            in_paths = True
            continue
        if in_paths:
            item = re.match(r'^\s*-\s*["\']?(.+?)["\']?\s*$', line)
            if item:
                paths.append(item.group(1))
            else:
                break
    if not paths:
        raise ValueError("no `paths:` list under `on.pull_request:`")
    return paths


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    """Translate a GitHub path filter into a regex.

    `**` crosses directory separators, `*` and `?` do not -- which is where
    fnmatch would get it wrong.
    """
    out = []
    index = 0
    while index < len(pattern):
        char = pattern[index]
        if pattern.startswith("**", index):
            out.append(".*")
            index += 2
        elif char == "*":
            out.append("[^/]*")
            index += 1
        elif char == "?":
            out.append("[^/]")
            index += 1
        else:
            out.append(re.escape(char))
            index += 1
    return re.compile("^" + "".join(out) + "$")


def matches(files: list[str], patterns: list[str]) -> list[str]:
    """Files matching the filter, GitHub's include/exclude semantics."""
    includes = [glob_to_regex(p) for p in patterns if not p.startswith("!")]
    excludes = [glob_to_regex(p[1:]) for p in patterns if p.startswith("!")]
    hits = []
    for name in files:
        if any(rx.match(name) for rx in includes) and not any(
            rx.match(name) for rx in excludes
        ):
            hits.append(name)
    return hits


# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="OWNER/NAME")
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--head-sha", required=True)
    parser.add_argument(
        "--workflow",
        required=True,
        help="workflow file name, e.g. ci-mobile.yml",
    )
    parser.add_argument(
        "--workflow-dir",
        default=".github/workflows",
        help="where to read the workflow file from (default: %(default)s)",
    )
    parser.add_argument(
        "--expect-always",
        action="store_true",
        help=(
            "The gated workflow has no path filter and must run on every pull "
            "request. Skips reading the filter instead of failing on its absence."
        ),
    )
    parser.add_argument(
        "--attempts",
        type=int,
        default=10,
        help="how often to look for the run (default: %(default)s)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=15,
        help="seconds between attempts (default: %(default)s)",
    )
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("::error::GITHUB_TOKEN is not set")
        return 1

    workflow_path = os.path.join(args.workflow_dir, args.workflow)
    try:
        with open(workflow_path, encoding="utf-8") as handle:
            source = handle.read()
    except OSError as error:
        print(f"::error::cannot read {workflow_path}: {error}")
        return 1

    if args.expect_always:
        # The caller states there is no filter, so there is nothing to read and
        # nothing to guess. Guard it anyway: a filter that appears later would
        # silently make this claim false, and the gate would demand a run on
        # pull requests the workflow correctly skips.
        if re.search(r"^\s*paths(-ignore)?:\s*$", source, re.M):
            print(
                f"::error::{args.workflow} does have a path filter, but this "
                "gate was told it always runs. Drop --expect-always."
            )
            return 1
        patterns = []
    else:
        try:
            patterns = parse_pull_request_paths(source)
        except ValueError as error:
            # No paths filter means the workflow runs on every pull request,
            # which is a valid setup -- but so is "the file changed shape and
            # this reader no longer understands it". They are indistinguishable
            # from here, and guessing wrong in the permissive direction is how a
            # gate goes quiet.
            print(f"::error::cannot read the path filter of {args.workflow}: {error}")
            print(
                "::error::If the workflow no longer filters by path, say so "
                "explicitly with --expect-always instead of letting this reader "
                "guess."
            )
            return 1

    files = changed_files(args.repo, args.pr, token)
    relevant = files if args.expect_always else matches(files, patterns)

    print(f"Gated workflow : {args.workflow}")
    print(f"Path filter    : {', '.join(patterns) if patterns else 'none — runs on every pull request'}")
    print(f"Changed files  : {len(files)}")

    # With --expect-always the run is due whatever changed -- a pull request
    # with no changed files at all still triggers the workflow, and treating
    # "nothing matched" as "correctly skipped" there would excuse a real miss.
    if not args.expect_always and not relevant:
        print("")
        print(f"None of them match. {args.workflow} is correctly not running.")
        print("::notice::Gate skipped by path filter, nothing to verify.")
        return 0

    if relevant:
        shown = ", ".join(relevant[:5]) + (" ..." if len(relevant) > 5 else "")
        print(f"Matching files : {len(relevant)} ({shown})")
    print("")
    print(f"Expecting a {args.workflow} run for {args.head_sha[:8]}.")

    runs: list[dict] = []
    for attempt in range(1, args.attempts + 1):
        runs = workflow_runs(args.repo, args.workflow, args.head_sha, token)
        if runs:
            break
        if attempt < args.attempts:
            print(f"  no run yet ({attempt}/{args.attempts}), waiting...")
            time.sleep(args.interval)

    if not runs:
        waited = args.attempts * args.interval
        print("")
        print(f"::error::No {args.workflow} run exists for {args.head_sha} after "
              f"{waited}s, although {len(relevant)} changed file(s) match its "
              f"path filter.")
        print("::error::The gate did not run. Do not merge on a green PR alone "
              "-- check the Actions tab.")
        return 1

    run = max(runs, key=lambda item: item["id"])
    status = run.get("status")
    conclusion = run.get("conclusion")
    print(f"  run {run['id']}: status={status} conclusion={conclusion}")

    if status != "completed":
        print("")
        print(f"::notice::{args.workflow} is running ({status}). Its own check "
              "reports the result -- this gate only proves it started.")
        return 0

    if conclusion == "success":
        print("")
        print(f"::notice::{args.workflow} completed successfully.")
        return 0

    jobs = job_count(args.repo, run["id"], token)
    print("")
    if jobs == 0:
        print(f"::error::{args.workflow} run {run['id']} failed before starting "
              "any job, so it produced no check run and the pull request looks "
              "clean. This is the PR #24 failure mode.")
        print("::error::Usual cause: the reusable workflow it calls cannot be "
              "resolved -- wrong ref, missing tag, or no access.")
    else:
        print(f"::error::{args.workflow} concluded '{conclusion}'.")
    print(f"::error::{run.get('html_url', '')}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
