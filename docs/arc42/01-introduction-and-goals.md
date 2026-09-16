# Introduction And Goals

Foldmark turns structured text into reliable physical and digital correspondence. A user writes a
document once and renders it onto whichever sheet it is going on: a DIN-style letter with fold and
punch marks, a blank A4 page, a duplex postcard, a card, a photo format — or hands it to a mail
client as text, HTML or an attachment.

## What makes it different

Word processors can print. What they do not expose is **configurable physical helper geometry**:
where the fold mark sits so the letter meets the envelope window, where the punch mark goes, which
area must stay clear of the trim. Foldmark models that geometry as first-class data in millimetres,
renders it in CSS millimetres, and shows the measurements so a user can check them with a ruler.

## Quality goals

| Goal                  | Why it comes first                                                                  | How it is held                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Physical accuracy** | A fold mark 3 mm out makes the letter unusable; the user finds out at the envelope. | Millimetres are the domain unit; the render plan is pure and unit-tested; zoom is a CSS transform that cannot reach an export. |
| **Privacy**           | The content is correspondence — names, addresses, signatures.                       | No account, no server, no analytics, no remote fonts. First load makes no third-party request.                                 |
| **Honesty**           | A print app that overstates what it did is worse than one that does less.           | No unverified standards claims, no "sent" for something handed to a mail client, no silently repaired input.                   |
| **Data safety**       | Local-first data is one cleared cache from gone.                                    | Complete backup export and import; deletion and preference reset are separate, separately confirmed actions.                   |
| **Accessibility**     | Correspondence is something everyone has to write.                                  | Keyboard operation, real landmarks, severity conveyed by word as well as colour, themes built for contrast.                    |

## Stakeholders

| Role                           | Expectation                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Private correspondent          | Write one formal letter, print it, have it fit the envelope.                            |
| Club secretary                 | Several sender identities, reusable addresses, local persistence, backups.              |
| Postcard creator               | Front image, back message and address, a duplex export that prints the right way round. |
| Privacy-conscious professional | A network-silent app with a visible data inventory and a working delete.                |
| Advanced user                  | Custom print profiles with inspectable geometry.                                        |
| Maintainer                     | Specs, ADRs, diagrams and tests that still describe the code in a year.                 |
