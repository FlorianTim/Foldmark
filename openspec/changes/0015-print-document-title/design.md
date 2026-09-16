# Design: Print under the document title

```
print()  →  document.title = printTitleFor(doc)  →  globalThis.print()
afterprint / next tick  →  document.title = previous
```

`printTitleFor` is a pure function beside the download helpers: title, else subject, else the app
name, whitespace collapsed, filename-unsafe characters replaced, cut at 80 characters. It is unit
tested; the browser part is a four-line wrapper.

| Decision                                                | Alternative rejected              | Why                                                                                                  |
| ------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Swap `document.title` around `print()`                  | A `<title>` bound to the document | The tab must keep saying "Foldmark" while editing; only the print needs the name.                    |
| Restore on `afterprint` **and** after `print()` returns | `afterprint` only                 | Firefox fires `afterprint` before the dialog closes; Chrome after. Both paths restore, idempotently. |
