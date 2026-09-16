# Design: Automatic working copy

```
edit → dirty → debounce(2000 ms) → WorkingCopyStore.put(documentId, snapshot)
save → DocumentRepository.save + optional Checkpoint + WorkingCopyStore.clear
```

The working copy is one row per document in a separate Dexie table, keyed by document id, carrying
the serialized document and a timestamp. Separate table, so the saved record is never half-written
and so "delete all content" can list it in the privacy inventory.

| Decision                    | Alternative rejected       | Why                                                            |
| --------------------------- | -------------------------- | -------------------------------------------------------------- |
| Separate table, one row/doc | Overwrite the saved record | Autosave must not silently become the record of what was sent. |
| Debounce 2 s, flush on hide | Interval                   | `visibilitychange` flush covers the closed-tab case.           |
