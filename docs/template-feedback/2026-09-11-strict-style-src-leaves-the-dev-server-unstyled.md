# A strict style-src leaves the dev server completely unstyled

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `blocker` for development, `none` for production
- **Status:** worked around here; needs a template fix

## Observed

The first `npm run dev` of the initialized app rendered as unstyled HTML — no layout, no theme,
default serif on the browser's default background. The production build was fine.

The browser console explains it:

```text
Applying inline style violates the following Content Security Policy directive 'style-src 'self''.
```

One error per imported stylesheet.

## Root cause

`index.html` ships `style-src 'self'` with no `'unsafe-inline'`, which is correct and worth keeping.
Vite's dev server injects every stylesheet as an inline `<style>` element so it can hot reload them;
the production build emits a linked stylesheet instead. So the policy that is right for the artifact
is wrong for the dev server, and only the dev server is affected.

This is **not** specific to Foldmark. It applies to the shipped Todo demo too — any developer
running `npm run dev` on the unmodified template sees the same thing. It was presumably not noticed
because the demo is legible without CSS and the production build is what gets reviewed.

## Workaround used here

A `transformIndexHtml` plugin in `vite.config.ts` with `apply: 'serve'` relaxes the directive for
the dev server only. The file on disk keeps the strict policy, so every build and
`npm run security:check` still read the strict version.

## Proposed template change

Ship that plugin in the template's own `vite.config.ts`, with the comment explaining why. It is
about fifteen lines, it cannot affect a build, and it removes a first-run experience that looks like
a broken installation.

## Security implications

None for shipped artifacts: the relaxation exists only in the dev server's in-memory HTML. The
matching risk is the opposite one — a developer who hits this and "fixes" it by editing `index.html`
would weaken the policy for real, which is an argument for solving it in the template rather than
leaving each app to discover it.

## Verification

`npm run dev` renders styled; `npm run build` output still contains `style-src 'self';` with no
`'unsafe-inline'`; `npm run security:check` passes.
