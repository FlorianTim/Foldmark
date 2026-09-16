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
- **Rich text:** document bodies are parsed by remark into a bounded non-HTML block model
  (`mdastAdapter.ts`) and rendered through static Vue templates and a fixed mail tag set; the editor
  and the renderers share one dialect (ADR 0011, change 0016).
- **Formatting and theme:** formatting beyond Markdown is a small directive catalogue held in a
  registry, colours are palette names resolved through the document theme with separate screen and
  print values, and unknown directives are preserved and rendered as their content (ADR 0019).
  Colours reach the DOM only as CSS variable references set through CSSOM, which keeps the strict
  `style-src` policy intact.
- **Distribution:** custom-domain Pages and portable ZIP releases share one verified build path.
