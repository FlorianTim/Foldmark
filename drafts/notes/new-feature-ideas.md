# New feature ideas

This file is the non-normative inbox for future template and application ideas. Requirements may be
entered in German. During the specification phase, translate accepted ideas into English, assign
stable requirement IDs, and reconcile `docs/product/requirements_roadmap.md`.

Use one version section per planned delivery:

```markdown
## [Version 1.2]

- [Must] German requirement or idea.
- [Should] Another requirement with useful context.
```

Store larger examples, screenshots and supporting notes below
`drafts/notes/versions/<version>/`. Never place credentials, production exports or personal data in
drafts.

## [Version 1.1]

- [Must] Publish each generated app at `<slug>.webapps.lumbrecode.de`.
- [Must] Produce a compressed, integrity-verifiable static release that can be extracted into a web
  root.
- [Must] Keep the default app free of cookies, trackers, remote fonts and non-essential external
  requests.
- [Must] Provide German and English UI, theme selection, privacy links and direct local-data deletion.
- [Must] Apply dependency, license, provenance and vulnerability gates locally and in CI.
- [Must] Capture sanitized problems from concrete apps and feed reusable lessons back into this
  template.
- [Should] Allow Todo text to be authored and safely rendered as a bounded Markdown subset.

## [Version 1.2]

- [Should] Add an optional server-side access-control adapter for apps that must not be public.
- [Could] Add a reviewed OWASP ZAP baseline profile for deployed preview environments.
