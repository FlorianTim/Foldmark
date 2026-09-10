# Shared documentation tooling

One content source per app, rendered wherever it is needed.

```text
docs/public-site/
  faq/<locale>.yaml            validated against schemas/public-site/v1/faq.schema.json
  guides/<locale>/*.md         front matter: id, locale, title, order
  screenshots.yaml             validated against schemas/screenshots/v1/manifest.schema.json
  screenshot-profiles.json     validated against schemas/screenshots/v1/profiles.schema.json
        │
        ├──▶ published website        (package-public-site / publish-public-site)
        └──▶ bundled in-app help      (render_app_help.py --target app)

design/screenshots/<profile>/<id>.png   written by the app's capture flow
```

## Why

Before this, every LumbreCode app carried its FAQ twice: once as the
website's `faq/<locale>.yaml`, once hand-written in the app bundle. They
drifted inside a single release, and the in-app copy was the one nobody
noticed was stale — because nobody reads their own app's help.

The screenshots had the mirror problem. Both templates could *produce* them
through their automated flow, and no document referenced them, so a capture
run proved nothing and a stale image would never have been caught.

## `render_app_help.py`

Renders the public-site content into the bundled help files.

```bash
# Flutter
python .lumbrecode/tooling/docs/render_app_help.py \
    --repo . --target app \
    --out apps/mobile_app/assets/help \
    --pattern '{document}_{locale}.md'

# Web
python .lumbrecode/tooling/docs/render_app_help.py \
    --repo . --target app \
    --out src/presentation/help
```

`--check` renders without writing and fails when the committed help is out of
date. That is the CI form: it makes an edit to a generated file visible
instead of letting it survive until someone regenerates.

### Screenshots per target

`{{screenshot:<id>}}` in a guide or an FAQ answer resolves differently:

| Target | Result |
|---|---|
| `--target site` | `![caption](…)` — a browser renders images |
| `--target app` | the caption as plain text |

The app targets drop the image deliberately. Neither in-app renderer resolves
image references — the Flutter `AppMarkdownView` and the web `parseMarkdown`
both refuse external resources by contract, and that restriction is a
security property. The caption carries the meaning instead.

Either way the reference is **validated**: the id must be declared in
`screenshots.yaml`, and the image must exist for the primary profile. A
`optional: true` shot degrades to a warning. It is for a screen CI genuinely
cannot reach — behind a device capability, or a permission a headless run
will never be granted — not for a shot whose capture step is simply
missing. Both templates commit their captured screenshots, so a missing one
is a hard failure.

## Screen profiles

`templates/screenshots/profiles.json` is the canonical set: `phone-portrait`
(primary), `tablet`, `desktop`. Every stack captures into
`design/screenshots/<profile>/`, so a Flutter integration test and a
Playwright spec produce images documentation can reference by the same name.

A repository may override the set with its own
`docs/public-site/screenshot-profiles.json`; it is validated against the same
schema either way.

## What is deliberately not here

The capture itself. Driving a Flutter app through `integration_test` and
driving a web app through Playwright have nothing in common beyond the output
layout, and a shared abstraction over them would be a wrapper around two
different tools that helps neither. What is shared is the **contract**: the
profile names, the file layout, and the manifest that says which shots the
documentation may rely on.
