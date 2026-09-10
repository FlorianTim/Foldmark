# Template customization

Use `template.config.json` and `scripts/init-template.py`. Product requirements belong in `drafts/`
before initialization and in OpenSpec after derivation. Do not turn the generic template into a
product by scattering hard-coded names through source files.

When `--config` points to another validated JSON file, the initializer copies that normalized
configuration to the canonical `template.config.json` before synchronizing runtime configuration,
package metadata, HTML metadata, and the workspace file. This keeps subsequent validation and CI
independent of the original input path.
