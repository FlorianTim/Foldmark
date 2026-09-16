# Email handoff

## Supported modes

- Plain-text body copied or opened through `mailto:`
- Restricted HTML body copied/downloaded
- Letter rendered as PDF for attachment
- EML file with text/HTML alternatives and attachments in a later slice
- Web Share of PDF where supported

## Default for a formal letter

Short email body plus PDF attachment. The PDF-for-email profile suppresses fold, hole and cut marks unless the user explicitly enables them.

## Security rules

- Reject CR and LF in addresses, subject and header fields.
- Sanitize HTML and use mail-client-compatible restricted markup.
- Limit `mailto:` length and provide copy/download fallback.
- Do not claim that a message was sent; Foldmark only prepares/hands off.
- Do not implement frontend SMTP credentials.
