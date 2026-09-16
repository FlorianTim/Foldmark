# The ESLint globals allow-list needs editing for ordinary browser APIs

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** worked around here by extending the list

## Observed

`eslint.config.js` declares browser globals explicitly rather than using an environment preset.
Building an ordinary application hit `no-undef` for:

`setTimeout`, `clearTimeout`, `requestAnimationFrame`, `ResizeObserver`, `BeforeUnloadEvent`,
`CSSStyleSheet`, `Image`, `TextEncoder`.

None is exotic. They came from a debounced editor input, a resize-aware preview, an unsaved-changes
guard, a runtime stylesheet, image decoding and UTF-8 encoding.

## Root cause

The curated list is a deliberate and defensible choice — it makes "which browser APIs does this app
touch?" answerable by reading one file. The cost is that it starts from a set sized for a Todo demo,
so the first real feature in any derived app fails the lint gate with an error that reads like a bug
rather than a policy.

## Resolution here

The eight names were added with a comment naming the feature each serves, preserving the list's
value as documentation.

## Proposed template change

Extend the shipped list with the common set above — `setTimeout` and `clearTimeout` in particular
are hard to argue as unusual — and add a sentence to `docs/development/SOURCE_CODE.md` saying that
the list is meant to be extended, with a comment, as the app touches more of the platform. Without
that sentence the reasonable reaction to a `no-undef` on `setTimeout` is to assume the rule is
misconfigured.
