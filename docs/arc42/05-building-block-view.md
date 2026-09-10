# Building Block View

The source is split into inward-facing layers:

- **Domain** owns immutable entities, bounds, and runtime schemas without framework imports.
- **Application** coordinates use cases and declares persistence ports and stable application
  errors.
- **Infrastructure** implements ports with browser technology and validates persisted data in both
  directions.
- **Presentation** renders Vue components, maintains Pinia screen state, translates errors, and owns
  resilient local UI preferences.
- **Composition root** wires application services to infrastructure adapters in one explicit place.

See `docs/development/SOURCE_CODE.md` for the file-level map and extension workflow.
