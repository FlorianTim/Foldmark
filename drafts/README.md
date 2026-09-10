# Draft input

Non-normative material. Nothing here binds a decision; only the OpenSpec
specifications derived from it do.

- `init/`: **the input for a new application** — see below.
- `notes/`: template-internal notes, prompts and requirement fragments.
- `assets/`: template-internal mockups, screenshots and reference images.

## `init/` is the special case

`drafts/init/` is the **only** part of `drafts/` that the Template
Initializer reads as app input, and the only part that survives
initialization:

- It holds the concrete app's description, notes, mockups, icons and
  resources — see `drafts/init/README.md`.
- The rest of `drafts/` is template-internal exploration and is **deleted**
  when a concrete app is generated.
- `drafts/init/` is deleted only once `drafts/init/processed.md` marks every
  entry `done` or `dropped`.

It stays non-normative throughout: what binds is the specification derived
from it, not the material itself.
