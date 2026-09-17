# Design: Own-sender onboarding

| Decision                                                       | Alternative rejected               | Why                                                                                                                                                          |
| -------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A card on the file manager                                     | A modal after the privacy notice   | C9 says "dezent": a second modal on first start is a wall; a card is read when the person is ready and stays out of the way of an import or a free document. |
| The existing `ContactDialog` with `presetSender`               | A reduced "just your address" form | One form, one validation, one set of fields the person will meet again in the directory; a reduced form would have to grow into the full one anyway.         |
| Roles set by the caller: `['primary', 'sender', …]` on `add`   | A new use case `setUpOwnSender`    | `AddressBookService.add` already enforces one primary and brings the stationery through `createAddress`; nothing new to test in the application layer.       |
| "Later" as a module-level flag, "Don't ask again" as a setting | Both as settings                   | A session skip that survives a reload is a dismissal by accident; a setting that is not a decision is noise in Diagnostics.                                  |
| The offer waits for `loadAll`                                  | Show immediately                   | Before the directory is loaded "no primary contact" is a guess; a card that flashes and vanishes is worse than one that appears a moment later.              |

## Presentation

`DocumentListPanel`: `offerSenderSetup` (loaded ∧ not dismissed ∧ not skipped ∧ no primary),
`skipSenderSetup`, `dismissSenderSetup`, `saveOwnSender`; the card, the success line and a
`ContactDialog` with `preset-sender`. `ContactDialog.presetSender` pre-checks the sender switch for
a new contact. `settingsRegistry.senderOnboardingDismissed` (`sender-onboarding-v1`), listed in
Diagnostics. i18n de/en under `documents.senderOnboarding`. Styles `.sender-onboarding*`.
