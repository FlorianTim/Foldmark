# Runtime View

## Todo mutation

1. The Vue panel sends untrusted title text to the Pinia store.
2. The store invokes `TodoService` through the composition root.
3. The service validates and normalizes input, checks the bounded collection size, and creates an
   immutable entity.
4. The repository port delegates to the Dexie adapter.
5. The adapter validates the entity before IndexedDB persistence.
6. Refreshed records are validated again when loaded and then exposed to the screen.

Expected input, limit, and persistence failures become stable German/English messages. Raw library
errors are not rendered.

## Preference startup

Theme, locale, and privacy-notice acknowledgement are read from slug-namespaced local storage.
Blocked access falls back to configuration defaults without preventing application startup.
