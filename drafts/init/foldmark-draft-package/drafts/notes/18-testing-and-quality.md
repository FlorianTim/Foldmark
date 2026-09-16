# Testing and quality plan

## Unit tests

- domain invariants and schemas
- Markdown/YAML codec round trips
- print-profile validation
- marker geometry conversion
- document validation per export target
- email header sanitization
- subject suggestion
- theme/settings rules

## Integration tests

- Dexie repositories using fake IndexedDB or browser tests
- asset Blob lifecycle
- import/export backup round trip
- render plan generation
- capability enable/disable and consent audit

## Component tests

- form validation and accessible error messages
- address/profile selectors
- dialog focus behavior
- print profile picker
- privacy center

## E2E

- create/reload/export a letter
- print preview contains expected marks
- import Markdown and recover invalid input
- create a postcard front/back
- delete/export all local data
- switch language and theme
- verify no unintended third-party requests

## Visual/physical tests

- screenshot regression for representative profiles
- calibration sheet with ruler/known dimensions
- manual print checklist at 100% scaling
- multi-browser print comparison documented, not assumed identical
