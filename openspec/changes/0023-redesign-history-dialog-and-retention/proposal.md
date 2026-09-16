# Proposal: History as a centred modal with retention rules

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §27. Roadmap
R13-023.

## Scope

- `HistoryDialog` on `AppDialog`: X, backdrop, Escape; entries show origin with an icon; manual,
  imported and restored versions are highlighted; preview, restore, open as copy, export.
- Retention setting "Keep automatic versions: 10 / 20 / 50 / 100" (default 50, the 1.0 bound);
  `selectPrunable` takes the bound from the setting; manual versions keep the hard bound of 100 and
  are never pruned by the automatic rule.

## Acceptance

AC-HIST-001…005. Unit tests for `selectPrunable` with the configurable bound.
