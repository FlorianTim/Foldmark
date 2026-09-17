# Proposal: Own-sender onboarding

Status: Implemented (2026-09-17). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil C, C9
("Onboarding für eigene Kontaktdaten"). Roadmap R15-006. Priority: Future / P2.

## Scope

- **The offer.** On the start view (the file manager), once the directory is loaded and no contact
  carries the `primary` role: a card "Would you like to store your sender details?" with **Set up
  now**, **Later** and **Don't ask again**. It sits above the toolbar and blocks nothing — a free
  document, an import or a letter without sender work as before.
- **Set up now** opens the ordinary contact dialog for a new contact with the sender switch already
  on. Saving stores the contact with the roles `primary` and `sender` (the service moves `primary`
  from any earlier holder) and the stationery a sender needs; a success line replaces the card. The
  dialog asks for nothing it did not ask for before: an e-mail address is optional, as is everything
  but the name or organisation.
- **Later** hides the card for this session, across views; the next start asks again. **Don't ask
  again** writes the preference `sender-onboarding-v1` and the card never returns, until settings
  are reset. Marking any contact primary in the directory makes the offer moot without a preference.
- **Not in scope:** a multi-step wizard, an offer inside the letter workspace, a nudge to add an
  e-mail address later, importing the sender from a file.

## Acceptance

- A fresh browser: after the privacy notice the card shows; Later hides it, a visit to the directory
  and back does not bring it back, a reload does.
- Set up now → first name, last name, street, city → Save: the card is gone, a success line shows, a
  new letter starts with "Erika Mustermann" as sender and the preview prints the street.
- Don't ask again → reload: no card. The preference appears under Settings → Diagnostics and falls
  with "Reset settings".
