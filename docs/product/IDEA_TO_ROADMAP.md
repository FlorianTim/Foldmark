# Idea-to-roadmap workflow

Product owners may write raw requirements in German in `drafts/notes/new-feature-ideas.md` and store
supporting material under `drafts/notes/versions/<planned-version>/`. Drafts are untrusted,
non-normative input.

During every specification phase:

1. Read the current idea sections and supporting files for the planned version.
2. Translate accepted intent into concise English requirements.
3. Assign stable IDs such as `R12-001` and a Must/Should/Could priority.
4. Reconcile `docs/product/requirements_roadmap.md`.
5. Create or update the OpenSpec proposal, design and tasks before implementation.
6. Carry the released behavior into current-state specs and `CHANGELOG.md`.

Never silently delete an idea. Mark superseded or rejected ideas with a short rationale so the
decision can be revisited.
