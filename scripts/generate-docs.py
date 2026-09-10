#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
diagram_dir = root / "docs" / "architecture" / "diagrams"
index = diagram_dir / "index.md"

diagrams = sorted([p for p in diagram_dir.glob("*") if p.suffix in {".mmd", ".puml"}])
lines = ["# Diagram index", "", "Generated from diagram source files.", ""]
for path in diagrams:
    rel = path.relative_to(root)
    lines.append(f"- [{path.name}](../../architecture/diagrams/{path.name})")
index.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Updated {index.relative_to(root)} with {len(diagrams)} diagrams")
