# Security Baseline

## Requirement

The application follows the repository OWASP/ASVS-oriented baseline, ships a restrictive
Content-Security-Policy without `'unsafe-inline'` for scripts or styles, and treats every input it
did not create as untrusted.

Specific obligations, each with a negative test:

- **No generated HTML.** Document text is parsed into a bounded token tree and rendered through
  static Vue templates. Neither the preview nor the HTML email renderer can turn document text into
  markup; no HTML sanitizer is required because no HTML is produced.
- **Bounded YAML.** Front matter is parsed by a purpose-built subset parser. Anchors, aliases, tags,
  block scalars and flow collections are refused with the offending line, not silently ignored.
  Depth, size, line count and key shape are bounded. Parsed objects have a null prototype and keys
  that could pollute a prototype are rejected.
- **No header injection.** Every value that reaches a mail header is refused — never repaired — when
  it contains a control character, and validation happens before any whitespace normalization.
- **Image imports are validated on what decodes**, not on what the file claims: the type is sniffed
  from the leading bytes, and dimensions and pixel count are read from the decoded image. SVG is not
  accepted.
- **Download and MIME filenames are neutralised** so they cannot act as paths.

## Verification

- `tests/security/` covers the negative cases for each obligation.
- `npm run security:check`, `npm run lint` and CodeQL cover configuration and sinks.
