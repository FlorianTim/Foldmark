# Solution Strategy

## Five decisions that shape everything else

### 1. Content and geometry are separate types

`Document` says what is being sent and to whom. `PrintProfile` says what the paper looks like.
Neither knows the other. That separation is the product: the same document renders as a DIN-style
letter, a blank page or an attachment without being rewritten.

### 2. The render plan is a pure data structure

`Document + PrintProfile + sender + assets + target → RenderPlan`, containing pages, markers and
positioned blocks in millimetres — no DOM, no CSS, no HTML. It is a pure function, so "does the fold
mark sit at 105 mm?" is a unit test rather than a screenshot comparison, and the preview, the print
copy and any future PDF adapter cannot drift apart because they consume the same structure.

### 3. Millimetres go all the way to the browser

The renderer emits CSS `mm`. The browser performs the physical mapping; Foldmark never converts to
pixels. Screen zoom is applied afterwards as a `transform` on a parent element, and a transform does
not change layout — which is why zooming physically cannot move a mark on paper.

### 4. Nothing generates HTML from user text

Document text is parsed into a bounded token tree and rendered through static Vue templates on
screen and through an escaping generator for HTML email. There is no sanitizer because there is
nothing to sanitize, and the app's widest attack surface — text from a file someone was sent —
cannot reach the DOM as markup. See ADR 0011.

### 5. Input is refused, not repaired

A YAML anchor, a subject containing a line break, an image that decodes larger than it claimed: each
is rejected with a reason naming what failed. Silent repair produces plausible-looking output and
hides that something tried.

## Achieving the quality goals

| Goal              | Strategy                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Physical accuracy | Pure render plan; CSS millimetres; pagination decided in the plan; a separate print-only DOM built in `paper` mode.            |
| Privacy           | No network code paths at all in this version; counted data inventory; complete export and delete.                              |
| Honesty           | `standardsStatus` as data; "prepare" rather than "send"; validation findings graded and shown in full.                         |
| Data safety       | One backup file containing documents, addresses, senders, profiles, assets and preferences, restored per record with a report. |
| Maintainability   | Layer boundaries enforced by a check; TSDoc on every export; specs, ADRs and diagrams versioned next to the code.              |
