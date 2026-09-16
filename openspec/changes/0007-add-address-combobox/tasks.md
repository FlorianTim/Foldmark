# Tasks: Address combobox

- [x] `AddressCombobox.vue` with the ARIA pattern and keyboard handling.
- [x] Pure `filterAddresses(query, addresses, role)` with tests.
- [x] Wire into the Document mode accordions.
- [x] e2e: keyboard selection of a recipient.

Notes: the filter is `matchesQuery` / `suggestAddresses` / `orderSenders` in the domain (tested in
`tests/addressBook.test.ts`); the popup renders at most 50 rows and hands over to the address book,
which opens with the typed query.
