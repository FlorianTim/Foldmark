# Capability System

## Requirement

External integrations are optional lazy-loaded adapters with explicit permissions and consent. No
connector is shipped enabled, and no connector code is loaded before consent.

Foldmark 0.1 ships **no** connectors. The privacy view states that the app is in local-only mode.
Any future connector — Drive, Contacts, address lookup — must declare its provider, purpose,
requested scopes and data flow before activation, use Authorization Code with PKCE without a client
secret, and must not persist third-party tokens.

Addresses record their provenance (`manual`, `imported-file`, `connector`) so data that arrived from
a third party stays identifiable as such.

## Verification

- `tests/e2e/foldmark.spec.ts` asserts that first load makes no third-party request.
- `docs/privacy/EXTERNAL_REQUEST_REGISTER.md` is the register of permitted external requests.
