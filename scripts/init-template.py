#!/usr/bin/env python3
"""Apply validated template configuration to the deterministic generated files."""

from __future__ import annotations

from pathlib import Path
import argparse
import json

from template_config import (
    format_generated_json,
    load_config,
    resolve_custom_domain,
    update_index_html,
)

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    """Validates input, reports a dry run, or updates only documented generated targets."""

    parser = argparse.ArgumentParser(description="Apply LumbreCode Web App Template configuration.")
    parser.add_argument("--config", default="template.config.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config_path = (ROOT / args.config).resolve()
    config = load_config(config_path)
    app = config["application"]
    organization = config["organization"]
    updates = {"template.config.json": format_generated_json(config)}
    resolved_domain = resolve_custom_domain(app, organization)
    runtime = {**app, "customDomain": resolved_domain, "organization": organization}
    updates["src/config/app.config.json"] = format_generated_json(runtime)
    if resolved_domain:
        updates["public/CNAME"] = f"{resolved_domain}\n"

    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    package.update(name=app["packageName"], version=app["version"], description=app["description"])
    updates["package.json"] = json.dumps(package, indent=2, ensure_ascii=False) + "\n"

    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    lock.update(name=app["packageName"], version=app["version"])
    lock["packages"][""].update(name=app["packageName"], version=app["version"])
    updates["package-lock.json"] = json.dumps(lock, indent=2, ensure_ascii=False) + "\n"

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    updates["index.html"] = update_index_html(index, app)

    workspace = {
        "folders": [{"path": "."}],
        "settings": {
            "editor.formatOnSave": True,
            "files.exclude": {"**/dist": True, "**/coverage": True},
            "typescript.tsdk": "node_modules/typescript/lib",
            "chat.useCustomizationsInParentRepositories": True,
        },
        "extensions": {
            "recommendations": [
                "Vue.volar",
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode",
                "ms-vscode-remote.remote-containers",
                "GitHub.copilot",
                "GitHub.copilot-chat",
            ]
        },
    }
    workspace_name = f'{app["slug"]}.code-workspace'
    old_workspaces = [path for path in ROOT.glob("*.code-workspace") if path.name != workspace_name]
    workspace_content = (
        old_workspaces[0].read_text(encoding="utf-8")
        if old_workspaces
        else json.dumps(workspace, indent=2) + "\n"
    )
    updates[workspace_name] = workspace_content

    if args.dry_run:
        print("Would update:")
        for relative_path in updates:
            print("-", relative_path)
        for old_workspace in old_workspaces:
            print("- remove", old_workspace.name)
        if not resolved_domain and (ROOT / "public" / "CNAME").exists():
            print("- remove public/CNAME")
        return

    for relative_path, content in updates.items():
        target = ROOT / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    for old_workspace in old_workspaces:
        old_workspace.unlink()
    cname = ROOT / "public" / "CNAME"
    if not resolved_domain and cname.exists():
        cname.unlink()
    print(f'Applied configuration for {app["name"]}.')


if __name__ == "__main__":
    main()
