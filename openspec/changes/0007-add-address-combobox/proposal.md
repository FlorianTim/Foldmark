# Proposal: Address combobox in the document

Status: Implemented (1.1)

## Motivation

Choosing an address in 1.0 is a select box. With a growing address book the select becomes a scroll,
and typing a name to find it is what everyone tries first.

## Scope

- Sender and recipient pickers are editable comboboxes following the WAI-ARIA Combobox pattern (list
  popup, keyboard navigation, `aria-activedescendant`, Escape closes, Enter selects).
- Empty input shows primary, home and about ten most recently relevant addresses.
- Typing filters locally across name, city and lines.
- An address-book icon next to the field opens the address book with the search prefilled.
- Selecting an address writes a snapshot into the document (change 0006).

## Out of scope

- Creating addresses inline; the book handles that.

## Acceptance

- Fully keyboard operable; screen reader announces the option count and the active option.
- Search over 5 000 addresses stays under 50 ms per keystroke on a mid-range laptop.
