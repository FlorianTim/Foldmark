# ADR 0009: Separate document content from print geometry

Date: 2026-09-11

## Status

Accepted

## Context

The input material describes one product requirement above all others: the same content has to be
renderable onto many different physical targets — a DIN-style letter, a blank page, a postcard, a
PDF for email. A model where a document owns its page size makes that a copy-and-edit operation.

## Decision

`Document` carries semantic content and metadata only. `PrintProfile` carries page geometry, named
regions and helper markers. A document _references_ a preferred profile by id; the workspace may
render it with another. Nothing in a document knows a millimetre of page size, and nothing in a
profile knows a recipient.

## Consequences

Switching a letter to another sheet is selecting a profile. Profiles can be shipped, cloned and
shared without touching documents. The cost is a resolution step — every render needs both objects
plus the resolved sender and assets — which is why `buildRenderPlan` takes everything already
resolved rather than fetching it.
