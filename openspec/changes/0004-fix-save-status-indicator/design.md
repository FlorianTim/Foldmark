# Design: Save status indicator

## State

```ts
type SaveStatus =
  | { kind: 'new' }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; message: string };
```

The workspace store derives `saveStatus` from what it already tracks (`document`, `dirty`, the
pending save) plus a `lastSavedAt` timestamp set in `save()`. `dirty` stays; it is the input, the
status is the presentation of it.

## Decisions

| Decision                                       | Alternative rejected            | Why                                                                                      |
| ---------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Status derived in the store, not the component | Component-local state           | Autosave (0008) and the history view (0009) read the same status.                        |
| Save button always enabled                     | Disabled when clean             | A disabled control explains nothing; a clean re-save is harmless and confirms the state. |
| Icon + text, colour via theme tokens           | Coloured dot only               | Colour alone fails the accessibility baseline the template commits to.                   |
| Time shown as `HH:MM` in the UI locale         | Relative time ("2 minutes ago") | Relative time needs a ticking clock; the absolute time is stable and enough.             |
