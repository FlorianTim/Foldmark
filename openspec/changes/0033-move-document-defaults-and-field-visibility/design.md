# Design: Document defaults, visibility, snapshots

| Decision                                                               | Alternative rejected                                | Why                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aliases become settings under `documentDefaults`                       | Keep a per-document editor in an "expert" accordion | A3 asks for global defaults now and an override "only when a document needs one"; nobody has asked, so the model keeps the field and the UI loses it. |
| Stored aliases in a document stay authoritative                        | Migrate documents to the new defaults               | A letter printed with red warnings must print red next year (ADR 0017's snapshot principle applies to themes as well).                                |
| `recipientContactId` next to the snapshot                              | Comparing the snapshot with every directory entry   | The sender already stores its source id; symmetric data, symmetric UI.                                                                                |
| "Reset from contact" replaces the snapshot, keeps the visibility flags | Reset everything                                    | Which contact details print is a document decision, not a directory fact.                                                                             |

## Settings

`documentDefaults.ts` gains `aliases: Partial<Record<ColorAlias, ColorTone>>` with the palette's
defaults; `SettingsPanel` category `colours` renders six selects plus a reset.
`workspaceStore.create` merges the defaults into `printOptions.theme` through `themeDeviations`, so
a default equal to the built-in palette leaves no key behind.

## Document model

`DocumentMetadata.recipientContactId?: string` (schema optional id; codec writes it under
`recipient-contact-id` in the Foldmark block of the front matter, next to `sender-profile-id`).
`chooseRecipient` sets it; typing into the fields keeps it (the status then says "changed");
clearing the recipient removes it.

`MetadataForm`: `recipientIsStale` mirrors `senderIsStale` (compare `postal` and the display name
against `library.addresses`); a `snapshot-status` line and a `Reset from contact` button under the
combobox in both groups; `workspace.refreshRecipientFromSource()` next to the sender's.

## Format → Document font…

The dispatcher command `theme:font` sets the `theme` accordion open (through the stored
`documentSectionsOpen` setting) and focuses `[data-testid="theme-font-size"]` on the next tick; on a
tabbed layout it switches the mode to `document` first.
