# ADR 0013: Write the @page size through a constructable stylesheet

Date: 2026-09-11

## Status

Accepted

## Context

`@page { size }` is the only way to request a specific sheet from a browser, it cannot be expressed
as an inline style or scoped to an element, and Foldmark's page size depends on the selected profile
— so the rule has to be written at runtime. The application ships `style-src 'self'` with no
`'unsafe-inline'`, which blocks an injected `<style>` element.

## Decision

Build a `CSSStyleSheet` in script and adopt it through `document.adoptedStyleSheets`. That is CSSOM
rather than inline content, so the strict policy permits it. Where constructable stylesheets are
unavailable the composable does nothing and printing falls back to the browser's default paper; the
preview stays correct either way because it is sized in millimetres by its own CSS.

Vite's dev server injects stylesheets inline for hot reloading, which the same policy blocks. A
dev-only `transformIndexHtml` relaxes `style-src` for the dev server; the file on disk, and
therefore every build, keeps the strict policy.

## Consequences

The strict policy survives into production untouched, and `npm run security:check` still reads a
strict `index.html`. The cost is two mechanisms to remember — CSSOM for runtime rules, and the
knowledge that the dev server's policy is not the shipped one, which is documented in
`vite.config.ts` where it is done.
