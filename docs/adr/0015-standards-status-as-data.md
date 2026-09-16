# ADR 0015: Model standards verification as data and show it

Date: 2026-09-11

## Status

Accepted

## Context

Foldmark ships DIN-style letter profiles built from commonly cited working values. The current
standard is a licensed document that has not been consulted. A print application that implies
conformance it has not verified causes exactly the failure it exists to prevent — and the user finds
out after the envelope is sealed.

## Decision

`PrintProfile.standardsStatus` is a domain field with three values: `draft-unverified`, `verified`,
`not-applicable`. The shipped DIN-style profiles are `draft-unverified`, are named "DIN-style …
(draft)", show a warning in the profile view, and emit an `info` finding on every print. Cloning a
profile keeps it unverified, because moving a fold mark cannot make geometry more
standard-conformant.

## Consequences

The app says something slightly awkward on every print of a DIN-style letter. That is the intended
trade: the claim becomes checkable, and marking a profile `verified` later is a data change plus a
documented source, not a code change.
