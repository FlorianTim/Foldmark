# Email Hand-off

## Requirement

Foldmark prepares a message and hands it to the user's mail client. It never sends, never stores
credentials, and never claims delivery.

Four modes: plain text, restricted HTML, PDF attachment (produced through the browser print dialog)
and a complete `.eml` file. A `mailto:` link is offered only when the message fits within the
supported URL length; above it the app says so and offers copy instead of a link that truncates
differently in every client.

The HTML body is safe by construction rather than by sanitizing: it is generated from the bounded
Markdown token tree with every text node escaped and a fixed tag set with no user-controlled
attributes.

Every header value is validated before any normalization and **refused, not repaired**, when it
contains a control character. MIME filenames are neutralised so a receiving client cannot treat one
as a path. Non-ASCII subjects are encoded as RFC 2047 words. MIME boundaries come from a CSPRNG.

The PDF intended for email suppresses fold, hole and cut marks by default; the user may re-enable
them per document, and the checks then say so.

## Verification

- `tests/email.test.ts` covers header safety, rendering, `mailto:` bounds and EML structure.
- `tests/security/untrustedInput.test.ts` covers hostile document text reaching the HTML body.
