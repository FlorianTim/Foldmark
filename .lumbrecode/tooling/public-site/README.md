# Vendored public-site tooling

This directory is copied into consumer repositories by the engineering
baseline. It enables local agents and developers to validate public content
without reading the private engineering repository at runtime.

Install validation dependencies:

```bash
python -m pip install PyYAML jsonschema
```

Validate:

```bash
python .lumbrecode/tooling/public-site/validate_public_site.py       docs/public-site
```
