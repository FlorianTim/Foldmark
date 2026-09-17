import {
  createAddress,
  createPostalEntry,
  type Address,
  type ContactPoint,
  type PostalEntry,
} from '@/domain/address/Address';
import { contactIdFromUid } from '@/domain/address/export/contactExport';
import type { ImportedContact } from '@/domain/address/import/contactImport';
import type { PostalAddress } from '@/domain/document/FoldmarkDocument';

/**
 * Deciding what an imported contact is to the directory (R14-013).
 *
 * The signals, strongest first: the file's own id seen before, the same
 * normalised e-mail, the same normalised phone, the same name at the same
 * postal code. Any of these makes a "probably existing" entry that is
 * skipped unless the person says merge or new. A name alone is a suggestion
 * — "needs review" — and imports as new unless the person says otherwise.
 * Nothing is ever merged without a decision.
 */
export type ImportSignal = 'external-id' | 'email' | 'phone' | 'name-postal-code' | 'name';

/** The three lists the review shows. */
export type ImportGroup = 'new' | 'existing' | 'review';

/** What the person chose for one imported contact. */
export type ImportDecision = 'skip' | 'merge' | 'new';

/** One imported contact with its strongest match and the decision it starts with. */
export interface ImportReviewEntry {
  readonly contact: ImportedContact;
  /** The directory entry the signal points at, when there is one. */
  readonly match: Address | null;
  readonly signal: ImportSignal | null;
  readonly group: ImportGroup;
  /** What happens unless the person changes it. */
  readonly defaultDecision: ImportDecision;
}

/** Every entry of an import plus the counts per group. */
export interface ImportReview {
  readonly entries: readonly ImportReviewEntry[];
  readonly counts: Readonly<Record<ImportGroup, number>>;
}

/** Lower-cased, trimmed. */
export function normalizeEmail(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Digits only, a leading `+` kept; `0049` becomes `+49`. */
export function normalizePhone(value: string | undefined): string {
  const digits = (value ?? '').replaceAll(/[^\d+]/gu, '');
  if (!digits) return '';
  const body = digits.startsWith('+')
    ? digits.slice(1)
    : digits.startsWith('00')
      ? digits.slice(2)
      : digits;
  const plus = digits.startsWith('+') || digits.startsWith('00');
  return `${plus ? '+' : ''}${body.replaceAll('+', '')}`;
}

/** Case-folded, diacritics stripped, whitespace collapsed. */
export function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function nameOf(address: Address): string {
  return normalizeName(
    [address.firstName, address.lastName].filter(Boolean).join(' ') || address.displayName,
  );
}

function importedName(contact: ImportedContact): string {
  return normalizeName(
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.displayName,
  );
}

function emailsOf(address: Address): readonly string[] {
  return [...address.emails.map((point) => point.value), address.email]
    .map(normalizeEmail)
    .filter(Boolean);
}

function phonesOf(address: Address): readonly string[] {
  return [...address.phones.map((point) => point.value), address.phone]
    .map(normalizePhone)
    .filter(Boolean);
}

function postalCodesOf(address: Address): readonly string[] {
  return [...address.addresses.map((entry) => entry.postal.postalCode), address.postal.postalCode]
    .map((code) => (code ?? '').trim())
    .filter(Boolean);
}

/** The strongest signal between one imported contact and one directory entry. */
export function matchSignal(contact: ImportedContact, existing: Address): ImportSignal | null {
  if (contact.externalId && existing.provenance.origin === contact.externalId) return 'external-id';
  // A file Foldmark wrote itself (change 0042) names the entry it came from.
  if (contact.externalId && contactIdFromUid(contact.externalId) === existing.id)
    return 'external-id';
  const emails = new Set(emailsOf(existing));
  if (contact.emails.some((email) => emails.has(normalizeEmail(email)))) return 'email';
  const phones = new Set(phonesOf(existing));
  if (contact.phones.some((phone) => phones.has(normalizePhone(phone)))) return 'phone';
  const name = importedName(contact);
  if (!name || name !== nameOf(existing)) return null;
  const codes = new Set(postalCodesOf(existing));
  const sameCode = contact.addresses.some((entry) =>
    codes.has((entry.postal.postalCode ?? '').trim()),
  );
  return sameCode ? 'name-postal-code' : 'name';
}

/** Groups every imported contact against the directory. */
export function reviewImport(
  contacts: readonly ImportedContact[],
  existing: readonly Address[],
): ImportReview {
  const entries = contacts.map((contact): ImportReviewEntry => {
    let best: { address: Address; signal: ImportSignal } | null = null;
    for (const candidate of existing) {
      const signal = matchSignal(contact, candidate);
      if (!signal) continue;
      if (!best || SIGNAL_RANK[signal] < SIGNAL_RANK[best.signal])
        best = { address: candidate, signal };
    }
    if (!best) return { contact, match: null, signal: null, group: 'new', defaultDecision: 'new' };
    if (best.signal === 'name') {
      return {
        contact,
        match: best.address,
        signal: 'name',
        group: 'review',
        defaultDecision: 'new',
      };
    }
    return {
      contact,
      match: best.address,
      signal: best.signal,
      group: 'existing',
      defaultDecision: 'skip',
    };
  });
  return {
    entries,
    counts: {
      new: entries.filter((entry) => entry.group === 'new').length,
      existing: entries.filter((entry) => entry.group === 'existing').length,
      review: entries.filter((entry) => entry.group === 'review').length,
    },
  };
}

const SIGNAL_RANK: Readonly<Record<ImportSignal, number>> = {
  'external-id': 0,
  email: 1,
  phone: 2,
  'name-postal-code': 3,
  name: 4,
};

/** What a new directory entry is made from. */
export function importedToAddress(
  contact: ImportedContact,
  importedAt: string,
): Parameters<typeof createAddress>[0] {
  const addresses: PostalEntry[] = contact.addresses.map((entry, index) =>
    createPostalEntry({
      postal: withOrganization(entry.postal, contact),
      ...(entry.label ? { label: entry.label } : {}),
      primary: index === 0,
    }),
  );
  const points = (values: readonly string[]): ContactPoint[] =>
    values.map((value, index) => ({ value, primary: index === 0 }));
  return {
    displayName: contact.displayName,
    ...(contact.firstName ? { firstName: contact.firstName } : {}),
    ...(contact.lastName ? { lastName: contact.lastName } : {}),
    addresses,
    // A contact without a postal address still needs the name on its (empty) primary entry.
    ...(addresses.length ? {} : { postal: withOrganization({}, contact) }),
    emails: points(contact.emails),
    phones: points(contact.phones),
    websites: points(contact.websites),
    ...(contact.notes ? { notes: contact.notes } : {}),
    tags: contact.tags,
    provenance: {
      source: 'imported-file',
      ...(contact.externalId ? { origin: contact.externalId } : {}),
      importedAt,
    },
  };
}

/** The organisation and department live on each postal address (change 0025). */
function withOrganization(postal: PostalAddress, contact: ImportedContact): PostalAddress {
  return {
    ...postal,
    ...(contact.organization && !postal.organization ? { organization: contact.organization } : {}),
    ...(contact.department && !postal.department ? { department: contact.department } : {}),
  };
}

/**
 * Adds what the import has and the directory lacks: postal addresses that are
 * not there yet, new e-mails, phones, websites and tags, a name or note where
 * the entry has none. Existing values are never overwritten.
 */
export function mergeContact(existing: Address, incoming: ImportedContact, now: string): Address {
  const knownPostal = new Set(existing.addresses.map((entry) => postalKey(entry.postal)));
  const addedAddresses = incoming.addresses
    .filter((entry) => !knownPostal.has(postalKey(entry.postal)))
    .map((entry) =>
      createPostalEntry({
        postal: withOrganization(entry.postal, incoming),
        ...(entry.label ? { label: entry.label } : {}),
        primary: false,
      }),
    );
  const addPoints = (
    current: readonly ContactPoint[],
    values: readonly string[],
    normalize: (value: string) => string,
  ): readonly ContactPoint[] => {
    const known = new Set(current.map((point) => normalize(point.value)));
    const added = values
      .filter((value) => !known.has(normalize(value)))
      .map((value): ContactPoint => ({ value, primary: false }));
    return [...current, ...added];
  };
  const tags = [...new Set([...existing.tags, ...incoming.tags])];
  return {
    ...existing,
    ...(existing.firstName ? {} : incoming.firstName ? { firstName: incoming.firstName } : {}),
    ...(existing.lastName ? {} : incoming.lastName ? { lastName: incoming.lastName } : {}),
    addresses: [...existing.addresses, ...addedAddresses],
    emails: addPoints(existing.emails, incoming.emails, normalizeEmail),
    phones: addPoints(existing.phones, incoming.phones, normalizePhone),
    websites: addPoints(existing.websites, incoming.websites, (value) =>
      value.trim().toLowerCase(),
    ),
    ...(existing.notes ? {} : incoming.notes ? { notes: incoming.notes } : {}),
    tags,
    provenance: {
      ...existing.provenance,
      ...(incoming.externalId && !existing.provenance.origin
        ? { origin: incoming.externalId }
        : {}),
      importedAt: now,
    },
    updatedAt: now,
  };
}

/** Street, postal code and city say whether two entries are the same place; the country rarely adds. */
function postalKey(postal: PostalAddress): string {
  return [postal.street, postal.postalCode, postal.city]
    .map((value) => normalizeName(value))
    .join('|');
}
