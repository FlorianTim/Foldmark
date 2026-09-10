# Crosscutting Concepts

- **Validation:** Zod protects browser runtime and persistence boundaries; the dependency-free
  Python validator protects initializer inputs.
- **Privacy:** no intentional third-party request occurs by default, and browser-owned data is
  slug-namespaced and directly deletable.
- **Security:** generated HTML is context-escaped, unsafe DOM sinks are prohibited, and CSP limits
  static application capabilities.
- **Accessibility:** semantic landmarks, localized labels, visible focus, keyboard operation, and
  responsive layouts are release requirements.
- **Internationalization and themes:** German and English plus seven local CSS-token themes ship as
  one coherent preference system.
- **Errors:** application error categories are localized; raw persistence exceptions remain
  internal.
- **Documentation:** exported APIs require TSDoc, and the source guide, OpenSpec, arc42, ADRs,
  threat model, privacy inventory, and tests must remain synchronized.
- **Rich text:** the Todo demo parses only a bounded non-HTML Markdown subset and renders typed
  tokens through static Vue templates.
- **Distribution:** custom-domain Pages and portable ZIP releases share one verified build path.
