# Design: Address combobox

One `AddressCombobox.vue` used for both roles, parameterised by role for the empty-state ordering.
Filtering is a pure function over an in-memory array kept by the library store; the popup renders at
most 50 rows with a "more in the address book" footer. No virtual scrolling in 1.1.

| Decision                  | Alternative rejected | Why                                                                   |
| ------------------------- | -------------------- | --------------------------------------------------------------------- |
| Own component, no library | A combobox library   | The base dependency set is preserved; the ARIA pattern is ~200 lines. |
| Snapshot on select        | Reference            | ADR 0017.                                                             |
