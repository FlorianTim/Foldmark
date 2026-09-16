# Prettier and eslint-plugin-vue disagree on a long interpolation, and both gates are blocking

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** worked around here by shortening the expression

## Observed

A template line slightly over the print width:

```html
<span>{{ asset.widthPx }} × {{ asset.heightPx }} px · {{ fileSize(asset.byteSize) }}</span>
```

Prettier reformats it to put the closing bracket on its own line:

```html
<span>{{ asset.widthPx }} × {{ asset.heightPx }} px · {{ fileSize(asset.byteSize) }}</span>
```

`vue/html-closing-bracket-newline` and `vue/html-indent` then report three warnings — and
`npm run lint` runs with `--max-warnings=0`. Running `--fix` restores the first form, which prettier
reformats again. The two gates cannot both be satisfied by editing the file.

## Root cause

`eslint-plugin-vue`'s `flat/recommended` includes stylistic rules that overlap prettier's territory.
The usual fix is `eslint-config-prettier`, which turns off exactly the rules a formatter owns; the
template does not include it.

## Resolution here

The interpolation was extracted into a small named function, which made the line short enough that
both tools agree. That was a genuine readability improvement, so it is not a bad outcome — but it
was chosen to satisfy tooling, not for its own sake, and the next collision may not have such a
convenient escape.

## Proposed template change

Add `eslint-config-prettier` and apply it after `vue.configs['flat/recommended']`. It is a
zero-runtime dev dependency whose entire purpose is this conflict, and it leaves every rule that is
about correctness rather than layout untouched.

If adding a dependency is unwanted, disabling `vue/html-closing-bracket-newline` and
`vue/html-indent` explicitly — the template already disables four other stylistic Vue rules for what
looks like the same reason — would cover the cases seen here.
