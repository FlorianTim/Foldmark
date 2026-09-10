# App interoperability contracts

Web apps generated from this template share the same interoperability contracts as the mobile ones.
The transport differs — a browser has no Android intents, so a web app exchanges these documents as
file downloads, uploads or clipboard content — but the **formats and rules are identical**.

The Android sections of the guides are transport detail. Everything about the canonical model,
serialization, tolerant reading, validation and the fixtures applies unchanged.

**The contracts are not owned here.** They live in `lumbrecode-engineering`, because more than one
app consumes them and they are versioned independently of any app version.

| Contract                | What it is                                                         | Normative source                                         |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| **JSCalendar Task**     | RFC 8984 `Task` / `Group` as LumbreCode emits them                 | `lumbrecode-engineering/docs/JSCALENDAR_TASK_INTEROP.md` |
| **LumbreCode Exchange** | A profile: CloudEvents 1.0 envelope around a JSCalendar payload    | `lumbrecode-engineering/docs/LUMBRECODE_EXCHANGE.md`     |
| **JSContact Card**      | RFC 9553 contact data — standardized, not yet implemented anywhere | `lumbrecode-engineering/docs/JSCONTACT_INTEROP.md`       |
| **Overview**            | Who sends what to whom                                             | `lumbrecode-engineering/docs/APP_INTEROP_OVERVIEW.md`    |

## How the files get here

Through the existing baseline sync (`profiles/common.json` in `lumbrecode-engineering`). Schemas and
golden fixtures land at:

```text
.lumbrecode/schemas/jscalendar-task/v1/
.lumbrecode/schemas/jscalendar-event/v1/
.lumbrecode/schemas/lumbrecode-exchange/v1/
.lumbrecode/schemas/app-interop/v1/
.lumbrecode/schemas/jscontact/v1/
```

They are copies under a lock file, not a second source of truth. Do not edit them here — change them
in `lumbrecode-engineering` and re-sync.

## Building an app that participates

Read `lumbrecode-engineering/docs/JSCALENDAR_TASK_INTEROP.md`. It is a field-by-field implementation
guide: canonical model, serialization rules, tolerant reading, the Android send/receive boundary, a
library audit with versions and licences, a capability matrix, and contract tests. Section 15
("Handoff to the Flutter app template") is written so a fresh session can build a compatible app
from it without re-opening any product question.

The short version:

1. Model RFC 8984 `Task` — stable v4 UUID, Markdown body with `descriptionContentType`, the
   five-value `progress` vocabulary, offset-free local date-times for `start`/`due`,
   `showWithoutTime` for date-only, single-parent sub-tasks via `relatedTo`.
2. Accept the media types explicitly (file input `accept`, drag-and-drop type check). Never accept
   `*/*`.
3. Read under a byte cap, validate totally, show an import review, write in one transaction after
   confirmation.
4. A `Group` becomes a **new list** — always. A familiar `uid` is provenance, never a reason to
   merge or sync.
5. Keep unknown properties, report every loss, never fetch a `href` automatically.
6. Use the golden fixtures as your test inputs. They are the same files WasThereSomething tests
   against, which is what makes "compatible" a test result rather than a claim.

## Two formats

| Format                                         | For                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `application/jscalendar+json;type=task\|group` | any app, LumbreCode or not                                                                                         |
| `application/cloudevents+json`                 | LumbreCode apps — same payload, wrapped in a CloudEvents 1.0 envelope carrying sending app, operation and revision |

The envelope is **strippable**: take `data` out and you have exactly the plain document. A receiver
can support both with one parser and one extra unwrapping step.

Nothing here is a proprietary format. CloudEvents is a CNCF specification; JSCalendar (RFC 8984) and
JSContact (RFC 9553) are IETF Proposed Standards. LumbreCode contributes only the profile on top.

## Validation

```bash
python -m pip install jsonschema
python scripts/validate_interop_contracts.py
```

(in `lumbrecode-engineering`; 63 fixtures across four contracts, two-stage validation for envelopes)
