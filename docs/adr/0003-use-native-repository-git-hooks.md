# ADR 0003: Use native repository Git hooks

Date: 2026-08-03

## Status

Accepted

## Context

The template needs a reusable, low-friction and agent-friendly foundation.

## Decision

Use versioned `.githooks` configured with `core.hooksPath` instead of an additional hook dependency.

## Consequences

The decision is enforced through source layout, scripts, tests and documentation checks.
