# Canonical Markdown/YAML format

## Goals

- readable without Foldmark
- stable round trips
- explicit schema version
- portable references without browser-specific IDs where feasible
- unknown metadata preserved where safe

## Draft structure

```markdown
---
foldmarkVersion: 1
kind: letter
title: Example
locale: de-DE
printProfile: din5008-b
senderProfileId: sender-private
recipient:
  organization: Stadt Beispiel
  street: Rathausplatz 1
  postalCode: "12345"
  city: Beispielstadt
date: 2026-08-03
subject: Antrag
signatureId: signature-default
export:
  pdf:
    includePhysicalMarks: true
  emailPdf:
    includePhysicalMarks: false
---

Sehr geehrte Damen und Herren,

hiermit ...
```

## Parsing rules

- YAML parsed as untrusted input.
- Validate with Zod and surface all issues.
- Do not instantiate arbitrary classes from input.
- Raw HTML in Markdown disabled by default.
- Links use an allowlisted protocol set.
- Preserve original source for failed imports so users can recover it.
