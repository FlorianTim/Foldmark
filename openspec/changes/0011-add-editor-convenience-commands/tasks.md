# Tasks: Editor convenience commands

- [x] Date token in the codec and renderer, with tests.
- [x] Commands and toolbar entries; shortcuts documented in the manual.
- [x] Salutation/closing lists per locale in i18n messages.

Notes: the table command lives in the editor toolbar (change 0010). Salutation and closing are
offered as a select — the document's own phrase first, then the locale's list — and inserted into
whichever view is active. Date tokens resolve in the render plan and in both email renderers.
