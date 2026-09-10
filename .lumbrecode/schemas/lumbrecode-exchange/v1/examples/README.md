# Golden fixtures — LumbreCode Exchange v1

These files are the **test inputs** of the reference implementation, not
copies of them. If a fixture changes, a test changes.

## Naming

| Prefix | Meaning |
|---|---|
| `0x` | event hand-offs; **must be accepted** |
| `2x` | task and task-list hand-offs; **must be accepted** |
| `9x-invalid-` | **must be rejected** by a conforming receiver |

## Accepted

| File | Covers |
|---|---|
| `01-time-off-planned.json` | one-day period, `sourceStatus` tentative/`planned` |
| `02-time-off-approved.json` | the same origin key at a higher `sequence` |
| `03-trip-planned.json` | a multi-day trip, not yet booked |
| `04-trip-booked.json` | the same trip, confirmed |
| `05-trip-booked-seq4-updated.json` | `sequence` 4 — the update-instead-of-duplicate case |
| `06-trip-cancelled.json` | `cancelled` in both the envelope and `payload.status` |
| `07-batch-mixed.json` | three items in one envelope, mixed types |
| `08-public-holiday.json` | `sourceStatus` without a `code` |
| `09-unknown-type-and-fields.json` | **forward compatibility**: an unknown event-type URI, an unknown envelope field, an unknown item field and an unknown payload property — all must be accepted and preserved |
| `20-task-in-envelope.json` | a JSCalendar `Task` travelling in the envelope |
| `21-task-group-in-envelope.json` | a whole `Group` of tasks in the envelope |

## Rejected

| File | Why |
|---|---|
| `90-invalid-malformed-json.json` | truncated JSON |
| `91-invalid-future-version.json` | `protocolVersion: 2` against the v1 schema |
| `92-invalid-wrong-protocol.json` | the retired `de.lumbrecode.event-exchange` identifier |
| `93-invalid-duplicate-uids.json` | the same `payload.uid` twice in one envelope |
| `94-invalid-unknown-category.json` | `sourceStatus.category` outside the closed vocabulary |
| `95-invalid-delete-operation.json` | `operation: delete` is reserved in v1 |
| `96-invalid-payload-without-sequence.json` | an exchanged payload must carry `sequence` |
| `97-invalid-payload-start-with-z.json` | `start` is a `LocalDateTime`; offsets and `Z` are not allowed |
| `98-invalid-unknown-payload-type.json` | `payloadType` outside the known set |

## Two kinds of strictness

Do not confuse them:

- **Emission** is strict. The standalone task and event schemas close
  `additionalProperties`, so a conforming producer writes only defined
  properties.
- **Reception** is tolerant. An unknown *property* inside a payload is kept
  verbatim, never a reason to reject — which is why
  `09-unknown-type-and-fields.json` must be accepted.

The validator applies exactly this split: payloads inside an envelope are
validated in relaxed mode, standalone fixtures in strict mode.

## Data

All names, dates and identifiers are fictional. No fixture contains real
personal data.

## Running

```bash
python -m pip install jsonschema
python scripts/validate_interop_contracts.py
```
