# Read first

This folder describes Foldmark as a product, not as a finished implementation. The Template Initializer should consume all notes and assets, reconcile overlaps and create reviewed OpenSpec specifications.

## Priority rule

When notes conflict, use this order:

1. Explicit security and privacy constraints
2. Core product principles and MVP acceptance criteria
3. Domain and print-profile model
4. UX flows
5. Examples and visual drafts
6. Future ideas

Do not infer that every idea must be in the first release.

## Main product principle

**Content, physical layout and delivery/export are separate concerns.**

- `Document` describes semantic content and references.
- `PrintProfile` describes page geometry and helper marks.
- `RenderPlan` combines content, profile, assets and export options.
- `ExportTarget` describes print, PDF, Markdown, HTML, email, EML, image or future ODT output.
