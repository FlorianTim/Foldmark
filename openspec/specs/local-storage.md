# Local Storage

## Requirement

Local-first persistence is exposed through application ports. IndexedDB/Dexie is the default
adapter. Database and UI-preference keys are namespaced by application slug. Persisted records are
validated when written and loaded, failures are recoverable, and demo data growth is bounded. Users
can clear and export local data in concrete apps.

## Verification

- Automated tests and repository policy checks cover the requirement.
