# ADR 0014: Keep shell views instead of adding a router

Date: 2026-09-11

## Status

Accepted

## Context

The draft material proposes URL routes (`/documents/:id`, `/addresses`, …). The template ships no
router and states that the base dependency set is preserved unless an accepted specification rules a
capability out.

## Decision

Map the proposed routes onto the template's existing view switch in `App.vue`, with the open
document held in a Pinia workspace store. The view set matches the proposed routes one-to-one.

## Consequences

No deep links, no browser back button between views, and no shareable URL for a document —
acceptable for a local-first app whose documents exist only in one browser, where a shared URL could
not resolve anyway. Adding `vue-router` later is a contained change: the view union becomes a route
table and the store already holds the document id. Recorded as an open question for review.
