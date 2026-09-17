import type { Address, ContactPoint, PostalEntry } from '@/domain/address/Address';
import type { PostalAddress } from '@/domain/document/FoldmarkDocument';

/**
 * Contact export (change 0042, R03-004): the directory as a vCard 4.0 file or
 * a Google-compatible CSV, written so that Foldmark's own import (change 0034)
 * reads it back without loss and other address books recognise it.
 *
 * Both writers take the stored `Address` — what the directory holds, not the
 * projections — so every postal address, e-mail, phone and website goes out,
 * with its label. What stays home: roles, stationery, contact visibility,
 * provenance, timestamps and the demo flag. They describe how *this* browser
 * uses an entry, not who the person is, and the receiving address book has no
 * field for them. A contact's own id travels as the UID so a re-import into
 * the same directory is recognised as "probably existing" rather than doubled.
 *
 * Nothing here is HTML or Markdown: every value is plain text in a text
 * format, escaped by that format's rules only.
 */

/** The formats the directory can be written as. */
export type ContactExportFormat = 'vcard' | 'csv';

/** Every export format, in the order the menu offers them. */
export const CONTACT_EXPORT_FORMATS: readonly ContactExportFormat[] = ['vcard', 'csv'];

/** File extension and media type of each format. */
export const CONTACT_EXPORT_FILE: Readonly<
  Record<ContactExportFormat, { readonly extension: string; readonly mimeType: string }>
> = Object.freeze({
  vcard: { extension: 'vcf', mimeType: 'text/vcard' },
  csv: { extension: 'csv', mimeType: 'text/csv' },
});

/** The prefix a stored contact's id carries as its UID. */
const UID_PREFIX = 'urn:foldmark:contact:';

/** Longest line of a vCard, in characters, before it is folded (RFC 6350 §3.2). */
const VCARD_LINE_MAX = 75;

/** The label parameter a vCard understands for a home or office entry. */
function vCardType(label: string | undefined): string | undefined {
  const text = (label ?? '').toLowerCase();
  if (!text) return undefined;
  if (['büro', 'buero', 'office', 'work', 'business', 'geschäftlich'].includes(text)) return 'work';
  if (['privat', 'private', 'home', 'zuhause'].includes(text)) return 'home';
  return undefined;
}

/** Escapes `\`, `,`, `;` and line breaks inside one value (RFC 6350 §3.4). */
function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/gu, '\\n');
}

/** Folds a content line at 75 characters with a leading space on each continuation. */
function fold(line: string): string {
  if (line.length <= VCARD_LINE_MAX) return line;
  const parts: string[] = [line.slice(0, VCARD_LINE_MAX)];
  let rest = line.slice(VCARD_LINE_MAX);
  while (rest.length) {
    parts.push(` ${rest.slice(0, VCARD_LINE_MAX - 1)}`);
    rest = rest.slice(VCARD_LINE_MAX - 1);
  }
  return parts.join('\r\n');
}

/** One property line, with an optional TYPE and LABEL parameter. */
function property(
  name: string,
  value: string,
  params: { readonly label?: string; readonly preferred?: boolean } = {},
): string {
  const parameters: string[] = [];
  const type = vCardType(params.label);
  if (type) parameters.push(`TYPE=${type}`);
  else if (params.label) parameters.push(`LABEL="${params.label.replaceAll('"', '')}"`);
  if (params.preferred) parameters.push('PREF=1');
  return fold(`${[name, ...parameters].join(';')}:${value}`);
}

/** ADR: PO box; extended; street; locality; region; postal code; country. */
function adrValue(postal: PostalAddress): string {
  return [
    '',
    postal.addressLine2 ?? '',
    postal.street ?? '',
    postal.city ?? '',
    postal.region ?? '',
    postal.postalCode ?? '',
    postal.countryCode ?? '',
  ]
    .map(escapeText)
    .join(';');
}

function pointLines(name: string, points: readonly ContactPoint[]): string[] {
  return points.map((point) =>
    property(name, escapeText(point.value), { label: point.label, preferred: point.primary }),
  );
}

/** One contact as a vCard 4.0 block, lines joined with CRLF. */
export function serializeVCard(contact: Address): string {
  const primary = contact.addresses.find((entry) => entry.primary) ?? contact.addresses[0];
  const organization = primary?.postal.organization ?? contact.postal.organization;
  const department = primary?.postal.department ?? contact.postal.department;
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    property('UID', `${UID_PREFIX}${contact.id}`),
    property('FN', escapeText(contact.displayName || organization || '')),
  ];
  if (contact.firstName || contact.lastName) {
    lines.push(
      property(
        'N',
        `${escapeText(contact.lastName ?? '')};${escapeText(contact.firstName ?? '')};;;`,
      ),
    );
  }
  if (organization) {
    lines.push(
      property(
        'ORG',
        [organization, department]
          .filter((part): part is string => Boolean(part))
          .map(escapeText)
          .join(';'),
      ),
    );
  }
  for (const entry of contact.addresses) {
    if (!hasPostalContent(entry)) continue;
    lines.push(
      property('ADR', adrValue(entry.postal), { label: entry.label, preferred: entry.primary }),
    );
  }
  lines.push(...pointLines('EMAIL', contact.emails));
  lines.push(...pointLines('TEL', contact.phones));
  lines.push(...pointLines('URL', contact.websites));
  if (contact.notes) lines.push(property('NOTE', escapeText(contact.notes)));
  if (contact.tags.length) {
    lines.push(property('CATEGORIES', contact.tags.map(escapeText).join(',')));
  }
  lines.push(property('REV', contact.updatedAt.replaceAll(/[-:]/gu, '').replace(/\.\d+/u, '')));
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function hasPostalContent(entry: PostalEntry): boolean {
  const { postal } = entry;
  return Boolean(
    postal.street || postal.addressLine2 || postal.city || postal.postalCode || postal.region,
  );
}

/** The whole directory as one vCard file; an empty directory is an empty string. */
export function serializeVCards(contacts: readonly Address[]): string {
  return contacts.map(serializeVCard).join('\r\n') + (contacts.length ? '\r\n' : '');
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Quotes one cell. A cell that a spreadsheet would read as a formula (`=`,
 * `+`, `-`, `@`, tab) gets a leading space: harmless on re-import, where the
 * reader trims it, and enough for a spreadsheet to keep it as text.
 */
function csvCell(value: string | undefined): string {
  const text = (value ?? '').replaceAll(/[\r\n]+/gu, ' ');
  const guarded = /^[=+\-@\t]/u.test(text) ? ` ${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

/** Fixed columns in Google Contacts spelling, so the header alone says what each holds. */
const CSV_FIXED_HEADER = [
  'Name',
  'Given Name',
  'Family Name',
  'Organization 1 - Name',
  'Organization 1 - Department',
  'Notes',
  'Labels',
] as const;

const CSV_ADDRESS_HEADER = (index: number) =>
  [
    `Address ${index} - Type`,
    `Address ${index} - Street`,
    `Address ${index} - Extended Address`,
    `Address ${index} - City`,
    `Address ${index} - Region`,
    `Address ${index} - Postal Code`,
    `Address ${index} - Country`,
  ] as const;

const CSV_POINT_HEADER = (kind: 'E-mail' | 'Phone' | 'Website', index: number) =>
  [`${kind} ${index} - Type`, `${kind} ${index} - Value`] as const;

/**
 * The whole directory as a Google-compatible CSV with a UTF-8 byte-order
 * mark (spreadsheets read umlauts correctly with it), CRLF line ends and
 * every cell quoted. Repeating groups get as many column groups as the
 * widest contact needs, at least one each, so the header is stable for a
 * given directory and every value has a column.
 */
export function serializeContactCsv(contacts: readonly Address[]): string {
  const widest = (pick: (contact: Address) => number) =>
    Math.max(1, ...contacts.map((contact) => pick(contact)));
  const addressCount = widest((contact) => contact.addresses.filter(hasPostalContent).length);
  const emailCount = widest((contact) => contact.emails.length);
  const phoneCount = widest((contact) => contact.phones.length);
  const websiteCount = widest((contact) => contact.websites.length);
  const groups = (count: number, header: (index: number) => readonly string[]) =>
    Array.from({ length: count }, (_, index) => header(index + 1)).flat();
  const header = [
    ...CSV_FIXED_HEADER,
    ...groups(addressCount, CSV_ADDRESS_HEADER),
    ...groups(emailCount, (index) => CSV_POINT_HEADER('E-mail', index)),
    ...groups(phoneCount, (index) => CSV_POINT_HEADER('Phone', index)),
    ...groups(websiteCount, (index) => CSV_POINT_HEADER('Website', index)),
  ];
  const rows = contacts.map((contact) => {
    const addresses = contact.addresses.filter(hasPostalContent);
    const primary = addresses.find((entry) => entry.primary) ?? addresses[0];
    const cells: (string | undefined)[] = [
      contact.displayName,
      contact.firstName,
      contact.lastName,
      primary?.postal.organization ?? contact.postal.organization,
      primary?.postal.department ?? contact.postal.department,
      contact.notes,
      contact.tags.join(' ::: '),
    ];
    for (let index = 0; index < addressCount; index += 1) {
      const entry = addresses[index];
      cells.push(
        entry?.label,
        entry?.postal.street,
        entry?.postal.addressLine2,
        entry?.postal.city,
        entry?.postal.region,
        entry?.postal.postalCode,
        entry?.postal.countryCode,
      );
    }
    const points = (list: readonly ContactPoint[], count: number) => {
      for (let index = 0; index < count; index += 1) {
        cells.push(list[index]?.label, list[index]?.value);
      }
    };
    points(contact.emails, emailCount);
    points(contact.phones, phoneCount);
    points(contact.websites, websiteCount);
    return cells.map(csvCell).join(',');
  });
  const bom = String.fromCodePoint(0xfeff);
  return `${bom}${[header.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`;
}

/** The text of the directory in the chosen format. */
export function serializeContacts(
  contacts: readonly Address[],
  format: ContactExportFormat,
): string {
  return format === 'vcard' ? serializeVCards(contacts) : serializeContactCsv(contacts);
}

/** The id a UID written by {@link serializeVCard} refers to, or nothing for a foreign UID. */
export function contactIdFromUid(uid: string | undefined): string | undefined {
  return uid?.startsWith(UID_PREFIX) ? uid.slice(UID_PREFIX.length) : undefined;
}
