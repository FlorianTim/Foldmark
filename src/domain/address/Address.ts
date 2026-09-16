import { createId } from '@/domain/common/Ids';
import type { AssetPlacement, PostalAddress } from '@/domain/document/FoldmarkDocument';

/**
 * The local contact directory.
 *
 * An `Address` is a *stored* contact: a person or organisation with any number
 * of postal addresses, e-mail addresses, phone numbers and websites (change
 * 0025), plus the things a directory needs and a letter does not — a display
 * name, roles, tags, and where the entry came from. The record type keeps its
 * 1.0 name so every consumer, backup and migration keeps working. Senders and
 * recipients live in the same directory: the same person is both, depending
 * on the letter. A document embeds a **snapshot** rather than referencing an
 * `Address` (ADR 0017), so a letter written today still says who it was
 * addressed to, and by whom, after the entry is edited or deleted.
 * Correspondence is a historical record.
 *
 * The scalar fields `postal`, `email`, `phone` and `website` are **projections
 * of the primary entries** of the lists: everything that renders, snapshots or
 * searches a contact reads them, and {@link normalizeContact} keeps them in
 * step with the lists on every read and write. A 1.0 record has only the
 * scalars; the lists are derived from them on read, so the migration is a
 * no-op until the contact is saved again.
 *
 * `source` exists because an address that arrived from a connector has to stay
 * identifiable as such — for the privacy inventory, and so a user can tell what
 * they typed from what Google told them.
 */

/** Longest display name or single address field. */
export const ADDRESS_FIELD_MAX_LENGTH = 120;

/** Longest single stationery line. */
export const STATIONERY_LINE_MAX_LENGTH = 200;

/** Most addresses one browser profile is expected to hold comfortably. */
export const ADDRESS_COLLECTION_MAX_SIZE = 5_000;

/** Where an address entry came from. */
export type AddressSource = 'manual' | 'imported-file' | 'connector';

/** Longest label of one address or contact point ("Privat", "Büro"). */
export const CONTACT_LABEL_MAX_LENGTH = 40;

/** Most postal addresses one contact may hold. */
export const POSTAL_ENTRIES_MAX = 8;

/** Most e-mail addresses, phone numbers or websites of one kind per contact. */
export const CONTACT_POINTS_MAX = 8;

/** Contacts shown per page of the directory (R13-027). */
export const CONTACTS_PAGE_SIZE = 25;

/** One postal address of a contact: home, office, PO box (R13-026). */
export interface PostalEntry {
  readonly id: string;
  /** What the person calls it: "Privat", "Postfach", "Büro". */
  readonly label?: string;
  readonly postal: PostalAddress;
  /** The address a letter goes to unless another is chosen; exactly one per contact. */
  readonly primary: boolean;
  readonly favorite?: boolean;
}

/** One e-mail address, phone number or website of a contact. */
export interface ContactPoint {
  readonly value: string;
  readonly label?: string;
  /** The one that is used and printed; at most one per kind. */
  readonly primary: boolean;
}

/**
 * What an address is to its owner.
 *
 * - `primary` — the one sender a new letter starts with; at most one.
 * - `home` — the private address, offered second; at most one.
 * - `sender` — may be used as a sender (has stationery).
 * - `favorite` — pinned near the top of pickers.
 * - `normal` — everything else.
 */
export type AddressRole = 'primary' | 'home' | 'sender' | 'favorite' | 'normal';

/** Every role, in the order a picker prefers them. */
export const ADDRESS_ROLES: readonly AddressRole[] = [
  'primary',
  'home',
  'sender',
  'favorite',
  'normal',
];

/** Provenance of one stored address. */
export interface AddressProvenance {
  readonly source: AddressSource;
  /** Identifier of the connector or import that produced it, when not manual. */
  readonly origin?: string;
  /** ISO-8601 timestamp of the import. */
  readonly importedAt?: string;
}

/**
 * Which contact details are printed when this address is used in a document.
 *
 * Stored on the address, not per document: "show my phone number" is a
 * property of how the address is used, and the snapshot carries the answer.
 * Absent means hidden.
 */
export interface ContactVisibility {
  readonly email?: boolean;
  readonly phone?: boolean;
  readonly website?: boolean;
}

/** What a sender brings to every letter: the footer block, a signature, letterhead artwork. */
export interface Stationery {
  /** Bank details, register numbers and the like, shown in the letter footer. */
  readonly footerLines: readonly string[];
  /** Identifier of a locally stored signature image used unless the document overrides it. */
  readonly defaultSignatureId?: string;
  /** Letterhead artwork placed on every letter from this sender. */
  readonly letterhead: readonly AssetPlacement[];
}

/** One entry in the local contact directory. */
export interface Address {
  readonly id: string;
  /** What the list shows; derived from the name and postal fields unless the user overrides it. */
  readonly displayName: string;
  /** Given name(s) of a person; absent for a pure organisation. */
  readonly firstName?: string;
  readonly lastName?: string;
  /** Every postal address; `postal` is the primary one. */
  readonly addresses: readonly PostalEntry[];
  readonly emails: readonly ContactPoint[];
  readonly phones: readonly ContactPoint[];
  readonly websites: readonly ContactPoint[];
  /** Projection: the primary postal address. */
  readonly postal: PostalAddress;
  /** Projection: the primary e-mail address. */
  readonly email?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly contactVisibility: ContactVisibility;
  readonly roles: readonly AddressRole[];
  /** Present when the address can act as a sender. */
  readonly stationery?: Stationery;
  readonly notes?: string;
  readonly tags: readonly string[];
  readonly provenance: AddressProvenance;
  /** When the address was last written into a document, for the picker's recent list. */
  readonly lastUsedAt?: string;
  /** Set on the demo records the settings page can insert and remove again (change 0026). */
  readonly demoData?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A new postal entry with a fresh id. */
export function createPostalEntry(
  input: { postal: PostalAddress; label?: string; primary?: boolean; favorite?: boolean },
  id = createId(),
): PostalEntry {
  return {
    id,
    label: input.label?.trim() || undefined,
    postal: input.postal,
    primary: input.primary ?? false,
    favorite: input.favorite || undefined,
  };
}

/** The primary of a list, or its first entry, or nothing. */
function primaryOf<T extends { readonly primary: boolean }>(list: readonly T[]): T | undefined {
  return list.find((entry) => entry.primary) ?? list[0];
}

/** Exactly one primary: the marked one, else the first. */
function withOnePrimary<T extends { readonly primary: boolean }>(list: readonly T[]): readonly T[] {
  const primary = primaryOf(list);
  return list.map((entry) => ({ ...entry, primary: entry === primary }));
}

/** Contact points without empty values, exactly one primary. */
function normalizePoints(list: readonly ContactPoint[]): readonly ContactPoint[] {
  return withOnePrimary(
    list
      .map((point) => ({
        value: point.value.trim(),
        label: point.label?.trim() || undefined,
        primary: point.primary,
      }))
      .filter((point) => point.value !== ''),
  ).slice(0, CONTACT_POINTS_MAX);
}

/**
 * Whether a postal address carries anything at all. A contact may have no
 * postal address (an e-mail-only correspondent), in which case the projection
 * is an empty object and the letter shows no recipient block.
 */
export function isEmptyPostal(postal: PostalAddress): boolean {
  return Object.values(postal).every((value) => !value || String(value).trim() === '');
}

/**
 * The lists and their projections in step.
 *
 * - A record without lists (1.0) gets them from its scalars.
 * - Exactly one postal entry and one point per kind is primary.
 * - `postal`, `email`, `phone`, `website` are the primary entries.
 * - The display name is derived when the user left it empty.
 *
 * Idempotent, so it is safe on every read and every write.
 */
export function normalizeContact(address: Address): Address {
  const entries =
    address.addresses.length > 0
      ? address.addresses
      : isEmptyPostal(address.postal)
        ? []
        : [createPostalEntry({ postal: address.postal, primary: true })];
  const firstName = address.firstName?.trim() || undefined;
  const lastName = address.lastName?.trim() || undefined;
  const name = personName({ firstName, lastName });
  // The name fields are the person; an entry without its own person line
  // (a "c/o", say) prints the contact's name in the address block.
  const addresses = withOnePrimary(entries)
    .slice(0, POSTAL_ENTRIES_MAX)
    .map((entry) =>
      name && !entry.postal.person?.trim()
        ? { ...entry, postal: { ...entry.postal, person: name } }
        : entry,
    );
  const fromScalar = (value: string | undefined): readonly ContactPoint[] =>
    value?.trim() ? [{ value: value.trim(), primary: true }] : [];
  const emails = normalizePoints(
    address.emails.length ? address.emails : fromScalar(address.email),
  );
  const phones = normalizePoints(
    address.phones.length ? address.phones : fromScalar(address.phone),
  );
  const websites = normalizePoints(
    address.websites.length ? address.websites : fromScalar(address.website),
  );
  const postal = primaryOf(addresses)?.postal ?? {};
  const next: Address = {
    ...address,
    firstName,
    lastName,
    addresses,
    emails,
    phones,
    websites,
    postal,
    email: primaryOf(emails)?.value,
    phone: primaryOf(phones)?.value,
    website: primaryOf(websites)?.value,
    displayName: address.displayName.trim(),
  };
  return {
    ...next,
    displayName: (next.displayName || deriveDisplayName(next)).slice(0, ADDRESS_FIELD_MAX_LENGTH),
  };
}

/** "Erika Beispiel", "Beispiel GmbH", or the display name — what a row is headed by. */
export function personName(address: Pick<Address, 'firstName' | 'lastName'>): string {
  return [address.firstName, address.lastName].filter(Boolean).join(' ').trim();
}

/** Whether the address may be used as a sender. */
export function canSend(address: Address): boolean {
  return address.roles.some((role) => role === 'sender' || role === 'primary' || role === 'home');
}

/** Whether the address carries the given role. */
export function hasRole(address: Address, role: AddressRole): boolean {
  return address.roles.includes(role);
}

/** The address lines in the order they are printed, skipping empty ones. */
export function addressLines(postal: PostalAddress): readonly string[] {
  const locality = [postal.postalCode, postal.city].filter(Boolean).join(' ');
  return [
    postal.organization,
    postal.department,
    postal.person,
    postal.street,
    postal.addressLine2,
    locality,
    postal.region,
    postal.countryCode,
  ]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
}

/**
 * A display name derived from the name and postal fields, for entries the
 * user did not name: the person, else the organisation, else the street.
 */
export function deriveDisplayName(
  source: PostalAddress | Pick<Address, 'firstName' | 'lastName' | 'postal'>,
): string {
  const postal = 'postal' in source ? source.postal : source;
  const name = ('postal' in source ? personName(source) : '') || postal.person;
  // A person is named as such, with the organisation when there is one; an
  // organisation is told apart from its namesakes by department or city.
  const primary = name || postal.organization || postal.street || '';
  const secondary = name ? postal.organization : postal.department || postal.city;
  return [primary, secondary].filter(Boolean).join(' – ').slice(0, ADDRESS_FIELD_MAX_LENGTH);
}

/** Creates a book entry from postal fields. */
export function createAddress(
  input: {
    /** The primary postal address; ignored when `addresses` is given. */
    postal?: PostalAddress;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    addresses?: readonly PostalEntry[];
    emails?: readonly ContactPoint[];
    phones?: readonly ContactPoint[];
    websites?: readonly ContactPoint[];
    email?: string;
    phone?: string;
    website?: string;
    contactVisibility?: ContactVisibility;
    roles?: readonly AddressRole[];
    stationery?: Stationery;
    notes?: string;
    tags?: readonly string[];
    provenance?: AddressProvenance;
    demoData?: boolean;
    id?: string;
  },
  now = new Date(),
): Address {
  const timestamp = now.toISOString();
  const roles = normalizeRoles(input.roles ?? ['normal']);
  return normalizeContact({
    id: input.id ?? createId(),
    displayName: input.displayName?.trim() ?? '',
    firstName: input.firstName,
    lastName: input.lastName,
    addresses: input.addresses ?? [],
    emails: input.emails ?? [],
    phones: input.phones ?? [],
    websites: input.websites ?? [],
    postal: input.postal ?? {},
    email: input.email,
    phone: input.phone,
    website: input.website,
    contactVisibility: input.contactVisibility ?? {},
    roles,
    stationery:
      input.stationery ??
      (roles.some((role) => role !== 'normal' && role !== 'favorite')
        ? { footerLines: [], letterhead: [] }
        : undefined),
    notes: input.notes,
    tags: input.tags ?? [],
    provenance: input.provenance ?? { source: 'manual' },
    demoData: input.demoData || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Roles without duplicates, in canonical order, never empty.
 *
 * `primary` and `home` imply `sender`: an address the user writes *from* must
 * be able to carry stationery, and a picker that lists senders must find it.
 */
export function normalizeRoles(roles: readonly AddressRole[]): readonly AddressRole[] {
  const set = new Set(roles);
  if (set.has('primary') || set.has('home')) set.add('sender');
  if (set.size > 1) set.delete('normal');
  if (set.size === 0) set.add('normal');
  return ADDRESS_ROLES.filter((role) => set.has(role));
}

/** A locale-aware comparator over display names. */
export function compareByDisplayName(locale: string): (left: Address, right: Address) => number {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return (left, right) => collator.compare(left.displayName, right.displayName);
}

/**
 * Senders in the order a picker offers them: primary, home, other senders and
 * favourites, then by most recent use, then alphabetically.
 */
export function orderSenders(addresses: readonly Address[], locale: string): readonly Address[] {
  const byName = compareByDisplayName(locale);
  const rank = (address: Address): number => {
    if (hasRole(address, 'primary')) return 0;
    if (hasRole(address, 'home')) return 1;
    if (hasRole(address, 'favorite')) return 2;
    return 3;
  };
  return addresses
    .filter(canSend)
    .slice()
    .sort((left, right) => {
      const byRank = rank(left) - rank(right);
      if (byRank !== 0) return byRank;
      const byUse = (right.lastUsedAt ?? '').localeCompare(left.lastUsedAt ?? '');
      if (byUse !== 0) return byUse;
      return byName(left, right);
    });
}

/**
 * The picker's suggestions when nothing has been typed: primary, home, then
 * the most recently used, up to `limit` — the addresses a person reaches for.
 */
export function suggestAddresses(
  addresses: readonly Address[],
  locale: string,
  limit = 10,
): readonly Address[] {
  const byName = compareByDisplayName(locale);
  const pinned = addresses.filter(
    (address) => hasRole(address, 'primary') || hasRole(address, 'home'),
  );
  const rest = addresses
    .filter((address) => !pinned.includes(address))
    .sort((left, right) => {
      const favourite = Number(hasRole(right, 'favorite')) - Number(hasRole(left, 'favorite'));
      if (favourite !== 0) return favourite;
      const byUse = (right.lastUsedAt ?? '').localeCompare(left.lastUsedAt ?? '');
      if (byUse !== 0) return byUse;
      return byName(left, right);
    });
  return [
    ...pinned.sort((l, r) => Number(hasRole(r, 'primary')) - Number(hasRole(l, 'primary'))),
    ...rest,
  ].slice(0, limit);
}

/** Addresses grouped by the first letter of their display name, sections sorted. */
export function groupByInitial(
  addresses: readonly Address[],
  locale: string,
): readonly { initial: string; addresses: readonly Address[] }[] {
  const byName = compareByDisplayName(locale);
  const groups = new Map<string, Address[]>();
  for (const address of addresses.slice().sort(byName)) {
    const first = address.displayName.trim().charAt(0);
    const initial = /\p{L}/u.test(first) ? first.toLocaleUpperCase(locale) : '#';
    groups.set(initial, [...(groups.get(initial) ?? []), address]);
  }
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  return [...groups.entries()]
    .sort(([left], [right]) =>
      left === '#' ? 1 : right === '#' ? -1 : collator.compare(left, right),
    )
    .map(([initial, list]) => ({ initial, addresses: list }));
}

/**
 * The lowercase text an address is searched by.
 *
 * Precomputed and stored so search stays a single indexed scan rather than a
 * field-by-field comparison across five thousand records on every keystroke.
 */
export function searchIndexOf(address: Address): string {
  return [
    address.displayName,
    personName(address),
    ...address.addresses.flatMap((entry) => [entry.label, ...addressLines(entry.postal)]),
    ...(address.addresses.length ? [] : addressLines(address.postal)),
    ...address.emails.map((point) => point.value),
    ...(address.emails.length ? [] : [address.email]),
    ...address.tags,
    address.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Lowercase with diacritics folded, so "Muller" finds "Müller" and "zurich" finds "Zürich". */
export function foldText(value: string): string {
  return value.normalize('NFD').replaceAll(/\p{M}/gu, '').replaceAll('ß', 'ss').toLowerCase();
}

/** Whether every character of `term` appears in `text` in order ("nie" in "niederlande"). */
export function isSubsequence(term: string, text: string): boolean {
  let position = 0;
  for (const character of term) {
    position = text.indexOf(character, position);
    if (position === -1) return false;
    position += 1;
  }
  return true;
}

/**
 * The directory search (R13-027): every term must match somewhere, where a
 * match is a word starting with the term, the term contained in a word, or —
 * the term as a subsequence of a word from its first letter (or anywhere for
 * a short term). Case and diacritics are folded. "Berlin" finds every contact
 * with a Berlin address, "amsterdm" still finds Amsterdam.
 */
export function fuzzyMatches(address: Address, query: string): boolean {
  const words = foldText(searchIndexOf(address))
    .split(/[^\p{L}\p{N}@.]+/u)
    .filter(Boolean);
  const haystack = words.join(' ');
  return foldText(query)
    .split(/\s+/u)
    .filter(Boolean)
    .every(
      (term) =>
        haystack.includes(term) ||
        words.some(
          (word) =>
            // A typo inside a word ("amsterdm") still spells the word from its
            // first letter; a short term may also sit anywhere in it.
            (word[0] === term[0] || term.length <= 4) && isSubsequence(term, word),
        ),
    );
}

/** One page of a list, 1-based; the last page when `page` is past the end. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize = CONTACTS_PAGE_SIZE,
): { readonly items: readonly T[]; readonly page: number; readonly pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pages };
}

/** In-memory filter for the picker: every term must appear somewhere. */
export function matchesQuery(address: Address, query: string): boolean {
  const haystack = searchIndexOf(address);
  return query
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/**
 * Whether two addresses look like the same recipient.
 *
 * Reported as a warning when saving, never acted on: merging two records that
 * only *look* alike is destructive and irreversible, and the two Müllers at the
 * same street number are a real case, not a data-quality problem.
 */
export function looksLikeDuplicate(first: Address, second: Address): boolean {
  const normalize = (value: string | undefined): string =>
    (value ?? '').toLowerCase().replaceAll(/\s+/g, ' ').trim();
  const samePerson =
    normalize(first.postal.person) !== '' &&
    normalize(first.postal.person) === normalize(second.postal.person);
  const sameOrganization =
    normalize(first.postal.organization) !== '' &&
    normalize(first.postal.organization) === normalize(second.postal.organization);
  const sameStreet =
    normalize(first.postal.street) !== '' &&
    normalize(first.postal.street) === normalize(second.postal.street);
  return (samePerson || sameOrganization) && sameStreet;
}
