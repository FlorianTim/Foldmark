#!/usr/bin/env python3
"""Optional diagram exporter.

This script deliberately avoids mandatory external CLIs so the repository remains easy to
bootstrap. If `mmdc` or `plantuml` is installed, extend this script to render SVG/PNG/PDF
artifacts into docs/architecture/generated/.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / "docs" / "architecture" / "generated"
out.mkdir(parents=True, exist_ok=True)
(out / "README.md").write_text(
    "# Generated diagrams\n\nInstall mermaid-cli and/or PlantUML to render diagram images here.\n",
    encoding="utf-8",
)
print("Prepared docs/architecture/generated")
