# Golden fixtures — LumbreCode Task Interchange v1

These files are the **test inputs** of the reference implementation, not
copies of them. If a fixture changes, a test changes. Documentation and
tests cannot drift.

Both apps — WasThereSomething and the LumbreCode To-do app — load the same
files. That is what makes "compatible" a test result rather than a claim.

## Naming

| Prefix | Meaning |
|---|---|
| `0x` – `1x` | single `Task` documents; **must be accepted** |
| `5x` | `Group` documents; **must be accepted** |
| `9x-invalid-` | **must be rejected** by a conforming validator |

## Accepted fixtures

| File | Covers |
|---|---|
| `01-task-minimal.json` | the smallest legal Task: `@type`, `uid`, `updated`, `title` |
| `02-task-markdown.json` | `description` + `descriptionContentType: text/markdown` |
| `03-task-start-only.json` | `start` with a time, no `due` |
| `04-task-due-date-only.json` | `due` at `T00:00:00` with `showWithoutTime: true` — the date-only form |
| `05-task-due-with-time.json` | `due` with a time and an explicit `timeZone` |
| `06-task-start-and-due.json` | both, plus `estimatedDuration` — and **not** a time block |
| `07-task-completed.json` | `progress: completed`, `percentComplete: 100`, `progressUpdated` |
| `08-task-percent-complete.json` | `progress: in-process` with a partial percentage |
| `09-task-priority.json` | `priority` and `keywords` |
| `10-task-parent.json` | a parent carrying two `child` relations |
| `11-task-subtask.json` | a child carrying one `parent` relation |
| `12-task-recurring.json` | weekly `recurrenceRules` + `recurrenceOverrides` with a completed instance and an excluded instance |
| `13-task-recurring-monthly-ordinal.json` | `interval` and `NDay.nthOfPeriod` (every other month, first Saturday) |
| `14-task-links.json` | a plain web `Link` |
| `15-task-future-attachment.json` | two `Link`s with `rel: "enclosure"` — the attachment shape, prepared for ~2.7, valid today |
| `50-group-simple.json` | a `Group` of three flat tasks |
| `51-group-nested-tasks.json` | a `Group` with a parent, two children and a sibling; both relation directions present |

## Rejected fixtures

| File | Why it must be rejected |
|---|---|
| `90-invalid-missing-type.json` | no `@type` on the top-level object |
| `91-invalid-due-with-offset.json` | `due` carries a UTC offset; `LocalDateTime` has none |
| `92-invalid-progress-value.json` | `delegated` is not in the IANA `progress` registry |
| `93-invalid-empty-title.json` | `title` must be 1..200 characters |
| `94-invalid-percent-out-of-range.json` | `percentComplete` above 100 |
| `95-invalid-group-without-entries.json` | a `Group` with an empty `entries` array |
| `96-invalid-uid-not-uuid.json` | `uid` is not a canonical RFC 4122 v4 UUID |

Note the difference between **schema rejection** and **tolerant reading**
(interoperability guide §5): these seven are malformed *emissions*. A
receiver reading a document from an unknown producer still keeps unknown
*properties* rather than rejecting the document.

## Data in the fixtures

All names, dates and URLs are fictional (Z-007). Hosts use the reserved
`example.invalid` domain and resolve nowhere. Every UUID is fixed so the
files stay diffable and so both apps can assert on them.

## Running the validation

The fixtures are validated by the reference implementation's own test suite
in `packages/task_interchange/test/` (planned), which runs as part of
`melos run ci`:

```bash
melos run ci
```

Each accepted fixture must decode into the expected domain object and
re-encode to a semantically equal document; each `9x-invalid-` fixture must
be rejected with a readable, categorized error (spec 0037, TSH-604,
AC-03/AC-24).

During planning the same check was run against the JSON Schema directly:

```bash
python -m pip install jsonschema
python -c "import json,glob,os,jsonschema; b='docs/contracts/jscalendar-task/v1'; s=json.load(open(b+'/jscalendar-task-v1.schema.json',encoding='utf-8')); jsonschema.Draft202012Validator.check_schema(s); v=jsonschema.Draft202012Validator(s); [print(os.path.basename(p), len(list(v.iter_errors(json.load(open(p,encoding='utf-8')))))) for p in sorted(glob.glob(b+'/examples/*.json'))]"
```

All 17 accepted fixtures validate and all 7 `9x-invalid-` fixtures fail,
verified 2026-08-25.
