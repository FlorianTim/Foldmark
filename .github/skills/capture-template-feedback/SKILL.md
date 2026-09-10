---
name: capture-template-feedback
description:
  Capture sanitized, versioned lessons from initialization, generation, build, test, security,
  privacy or deployment problems and turn them into reusable improvements for the LumbreCode
  template the app came from. Use after a workaround was needed, a template assumption failed, or
  a repeated manual step was discovered.
---

# Capture Template Feedback

A template only improves if the friction it caused is written down at the
moment it caused it. "The initializer deleted something it should have kept"
is obvious on the day and gone two weeks later.

## When

- **While generating an app** — every ambiguity, stale instruction, wrong
  classification or missing step, **including the ones you worked around**.
  An empty register after a full initialization is a suspicious result, not
  a good one.
- **While building features** — whenever a template decision costs time: a
  missing seam, a rule that turned out wrong, a test helper that does not
  cover the real case.

## Not feedback

- Bugs in this app's own code. Those are ordinary issues.
- Things the template deliberately does not do, recorded in an
  `out-of-scope` document or an ADR. Disagreeing with a recorded decision
  earns an entry only if experience now contradicts its reasoning — say
  which part.

## Workflow

1. Confirm the problem is **generic to the template**, not specific to this
   product.
2. Read the version files, the relevant command output, and the files that
   established the failed assumption. Do not collect unrelated project
   content.
3. **Sanitize**: remove credentials, personal data, private hostnames,
   tokens and customer-specific identifiers.
4. Create `docs/template-feedback/YYYY-MM-DD-short-slug.md` containing:
   - the template version and commit this app was generated from
     (`GENERATED_FROM_TEMPLATE`) and the app's own version;
   - environment and exact, safe reproduction steps;
   - expected and observed behaviour;
   - root cause and the temporary workaround;
   - the **smallest** generic template change that would prevent it;
   - architecture, privacy, security and accessibility impact;
   - the test or check that would catch a recurrence.
5. Check existing entries and upstream issues before proposing a duplicate.
6. In the template repository, take accepted feedback through its normal
   spec workflow — idea, spec, plan, story — and a changelog entry. Code
   changes only after that boundary.
7. Link the upstream pull request, or the rationale for rejection, from the
   entry.

## Severity

| | Meaning |
|---|---|
| `blocker` | Had to be fixed before the app could continue |
| `friction` | Cost real time, worked around |
| `papercut` | Small, but it will annoy every derived app |
| `idea` | Not a problem — something the template should have |

## Guardrails

- Never copy an app's drafts wholesale into the template.
- Never weaken a gate merely to make one generated app pass.
- Prefer a deterministic initializer or validation improvement over
  app-specific instructions.
- Preserve the template's example app until initialization is explicitly
  requested.
- If the finding changes a trust boundary, update the threat model before
  implementing.
