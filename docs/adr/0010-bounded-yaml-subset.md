# ADR 0010: Parse front matter with a bounded subset instead of a YAML library

Date: 2026-09-11

## Status

Accepted

## Context

Foldmark reads metadata from `.md` files that users were handed, which makes the front-matter parser
one of its most exposed components. A general YAML implementation brings anchors and aliases
(expandable into a billion nodes), tags (type construction), merge keys, and implicit typing that
turns `NO` into `false` and a postcode into an integer. The `yaml` package is already present as a
build-time dev dependency, so using it at runtime would have been free in dependency terms.

## Decision

Parse only what Foldmark emits: a mapping of scalars, nested mappings and sequences of scalars, with
bounded depth, size, line count and key shape. Anchors, aliases, tags, block scalars and flow
collections are **refused with the offending line number**. Unquoted scalars are typed
conservatively — only `true`, `false`, `null` and numerals are non-strings. Parsed objects have a
null prototype, and prototype-polluting keys are rejected outright.

## Consequences

Files produced by other YAML tools may not parse, and the parser has to be maintained. In exchange
it is around 250 readable lines whose failure modes are enumerated and tested, a postcode stays a
string, `city: NO` stays Norway, and no runtime dependency sits on the trust path. The emitter is
written against the same subset, so round trips are safe by construction.
