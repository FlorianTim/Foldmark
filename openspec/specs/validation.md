# Target-Aware Validation

## Requirement

A document is validated **for an export target**, not in the abstract. The same missing postal
address is an error for `print`, a warning for `email-pdf` and irrelevant for `markdown`.

Findings are graded `error` (this output cannot be produced), `warning` (it can, and will probably
be wrong on paper) and `info` (worth knowing). All findings are returned at once, most severe first,
so a form does not reveal one problem per attempt.

Findings carry a translation key and bounded parameters, never prose. Profile findings are merged
into the document's list: a user pressing Print wants one list of reasons, not two panels.

The 100 % scaling reminder and the unverified-standards note are `info` findings on every print,
because they are true of the process rather than defects in the document.

## Verification

- `tests/validateForTarget.test.ts` covers the per-target severity matrix.
