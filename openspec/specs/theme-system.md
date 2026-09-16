# Theme System

## Requirement

Themes are local CSS custom properties. No remote fonts, stylesheets or images are loaded. The
shipped themes are `system`, `light`, `dark`, `paper`, `sepia`, `high-contrast` and `ocean`; the
application's configured theme is the default.

Three token families exist and are kept apart deliberately:

- `--app-*` — shell tokens, redefined by every theme.
- `--fm-*` — print-surface tokens. Paper is white with black ink in every theme, because that is
  what the printer produces; only the canvas around the sheet and the on-screen colour of a helper
  mark follow the theme.
- `--color-*` — daisyUI's semantic slots, mapped once onto the two families above so borrowed
  components cannot introduce a second palette.

The print stylesheet is separate and must not inherit a dark-mode background.

## Verification

- `tests/e2e/foldmark.spec.ts` switches and persists every shipped theme.
- Automated tests and repository policy checks cover the requirement.
