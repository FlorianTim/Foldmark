# ADR 0018: Address lookup — offline first, no provider for 1.2

Date: 2026-09-11

## Status

Accepted (research change 0014). Revisit when a user need for lookup is recorded that the offline
option does not meet.

## Context

Address entry is error-prone; postal-code lookup and address completion would help. Any such
provider is a network request carrying a real person's address — precisely what Foldmark's privacy
model exists to control (ADR 0005, `openspec/specs/capability-system.md`). Change 0014 asked for a
decision before any code.

## Candidates

| Option                                                            | What leaves the browser                           | Terms and licence                                                                               | Verdict                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bundled postal-code table (DE/AT/CH, OpenPLZ / GeoNames extracts) | Nothing                                           | GeoNames CC BY 4.0, OpenPLZ API data ODbL; attribution in the notices file                      | **Take**: city from postal code, offline, ~300 KB per country as a lazily loaded chunk                  |
| OpenStreetMap Nominatim                                           | Every keystroke or the typed address, plus the IP | ODbL data; usage policy forbids autocomplete and heavy use from apps without their own instance | Reject for a client-only app: policy-incompatible, and a shared endpoint sees every address typed       |
| Photon (komoot)                                                   | The typed address, plus the IP                    | Open source, public instance "fair use", no SLA                                                 | Possible only as a connector against a self-hosted instance the user configures                         |
| Google Places Autocomplete                                        | Every keystroke, IP, session token                | Requires an API key, billing account, Google terms; data may be used per Google's policies      | Reject: contradicts privacy by default and needs a key the app would have to ship or the user to obtain |
| Deutsche Post Datafactory / commercial verifiers                  | The address                                       | Commercial, contract per customer                                                               | Out of scope for a local-first app without accounts                                                     |

## Decision

1. **1.2 ships no lookup provider.** Address completion that sends text to a third party while the
   user types is the opposite of what the address book promises.
2. **Postal-code → city lookup is done offline** for Germany, Austria and Switzerland from a bundled
   table, loaded as a separate chunk only when the address form is opened. The table is data with
   attribution, no request, no key. This covers the most common error (a wrong or missing city) and
   nothing more.
3. A **self-hosted geocoder connector** (Photon or Nominatim on the user's own server) may be
   specified later under the capability model: opt-in, the endpoint entered by the user, one request
   per explicit action — never per keystroke — and the request register updated first.

## Consequences

- The external request register stays empty; the privacy check stays green.
- Street-level validation is not offered. The product says so rather than pretending.
- The bundled table is a licence and size decision to be recorded in the dependency review and the
  third-party notices when it is added (roadmap R12-001 becomes "offline postal-code table").
