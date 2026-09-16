import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import type { PostalAddress } from '@/domain/document/FoldmarkDocument';
import { COUNTRY_CODES } from '@/domain/address/countries';

/**
 * Contacts read from a file (R14-013): what vCard and CSV have in common.
 *
 * A reader turns untrusted text into these records and never throws — a bad
 * file is a report, the way the Markdown codec handles one. Everything is
 * plain text, trimmed and bounded; photos, keys, calendars and every other
 * property Foldmark has no use for are dropped on the floor.
 */
export interface ImportedContact {
  /** A stable id from the file (vCard `UID`, a CSV id column), for recognising re-imports. */
  readonly externalId?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly displayName: string;
  readonly organization?: string;
  readonly department?: string;
  readonly addresses: readonly { readonly label?: string; readonly postal: PostalAddress }[];
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly websites: readonly string[];
  readonly notes?: string;
  readonly tags: readonly string[];
}

/** The outcome of reading one file. */
export interface ContactImportResult {
  readonly contacts: readonly ImportedContact[];
  readonly issues: readonly ValidationIssue[];
}

/** Bounds that keep a hostile file from becoming a problem. */
export interface ImportLimits {
  /** Largest file in bytes of text. */
  readonly maxBytes: number;
  /** Most contacts read from one file; the rest is reported and skipped. */
  readonly maxContacts: number;
  /** Longest single card or row. */
  readonly maxEntryBytes: number;
}

/** 5 MB, 5 000 contacts, 64 KiB per entry. */
export const DEFAULT_IMPORT_LIMITS: ImportLimits = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  maxContacts: 5_000,
  maxEntryBytes: 64 * 1024,
});

/** Longest text kept for one field. */
const FIELD_MAX = 120;
/** Longest note kept. */
const NOTE_MAX = 2_000;

/** Control characters have no place in a name or a street; whitespace is kept for collapsing. */
function isControl(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
}

function clean(value: string | undefined, max = FIELD_MAX): string | undefined {
  const text = Array.from(value ?? '')
    .filter((char) => !isControl(char))
    .join('')
    .replaceAll(/\s+/gu, ' ')
    .trim();
  return text ? text.slice(0, max) : undefined;
}

/** `Deutschland`, `Germany`, `DE` → `DE`; unknown stays absent. */
function countryCodeOf(
  value: string | undefined,
  names: Intl.DisplayNames | null,
): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const upper = text.toUpperCase();
  if (upper.length === 2 && COUNTRY_CODES.includes(upper)) return upper;
  if (!names) return undefined;
  const wanted = text.toLowerCase();
  return COUNTRY_CODES.find((code) => names.of(code)?.toLowerCase() === wanted);
}

/** Localised country names in the languages a contact file is likely written in. */
function countryNames(): readonly Intl.DisplayNames[] {
  const locales = ['de', 'en', 'fr', 'it', 'es', 'nl'];
  const result: Intl.DisplayNames[] = [];
  for (const locale of locales) {
    try {
      result.push(new Intl.DisplayNames([locale], { type: 'region' }));
    } catch {
      // A runtime without this locale simply matches fewer spellings.
    }
  }
  return result;
}

function resolveCountry(
  value: string | undefined,
  tables: readonly Intl.DisplayNames[],
): string | undefined {
  for (const names of [null, ...tables]) {
    const code = countryCodeOf(value, names);
    if (code) return code;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** What kind of contact file the text is, by its first meaningful line. */
export function detectContactFile(text: string): 'vcard' | 'csv' | 'unknown' {
  const head = text
    .replace(/^\uFEFF/u, '')
    .trimStart()
    .slice(0, 200)
    .toUpperCase();
  if (head.startsWith('BEGIN:VCARD')) return 'vcard';
  const firstLine = head.split(/\r?\n/u)[0] ?? '';
  if (firstLine.includes(',') || firstLine.includes(';') || firstLine.includes('\t')) return 'csv';
  return 'unknown';
}

/** Reads whichever format the text is in; an unknown format yields no contacts and a report. */
export function parseContactFile(
  text: string,
  limits: ImportLimits = DEFAULT_IMPORT_LIMITS,
): ContactImportResult {
  switch (detectContactFile(text)) {
    case 'vcard':
      return parseVCard(text, limits);
    case 'csv':
      return parseContactCsv(text, limits);
    default:
      return {
        contacts: [],
        issues: [{ severity: 'error', code: 'contactImport.unknownFormat', path: '' }],
      };
  }
}

// ---------------------------------------------------------------------------
// vCard
// ---------------------------------------------------------------------------

interface VCardProperty {
  readonly name: string;
  readonly params: Readonly<Record<string, string>>;
  readonly value: string;
}

/** Unfolds continuation lines (RFC 6350 §3.2) and splits the text into cards. */
function vCardBlocks(text: string): readonly string[][] {
  const unfolded = text
    .replace(/^\uFEFF/u, '')
    .replaceAll(/\r\n[ \t]/gu, '')
    .replaceAll(/\n[ \t]/gu, '')
    .split(/\r?\n/u);
  const cards: string[][] = [];
  let current: string[] | null = null;
  for (const line of unfolded) {
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VCARD') {
      current = [];
    } else if (upper === 'END:VCARD') {
      if (current) cards.push(current);
      current = null;
    } else if (current && line.trim()) {
      current.push(line);
    }
  }
  return cards;
}

/** Decodes a quoted-printable value (vCard 2.1 files still carry them). */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  const source = value.replaceAll(/=\r?\n/gu, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '=' && /^[0-9A-F]{2}$/iu.test(source.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(source.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(...new TextEncoder().encode(char));
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

function parseProperty(line: string): VCardProperty | null {
  const colon = line.indexOf(':');
  if (colon <= 0) return null;
  const head = line.slice(0, colon);
  let value = line.slice(colon + 1);
  const [rawName, ...rawParams] = head.split(';');
  // `item1.EMAIL` (Apple) → `EMAIL`
  const name = (rawName ?? '').replace(/^[^.]+\./u, '').toUpperCase();
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const [key, ...rest] = param.split('=');
    const paramName = (key ?? '').toUpperCase();
    // vCard 2.1 writes `EMAIL;HOME;INTERNET` — a bare word is a TYPE.
    if (!rest.length) params.TYPE = [params.TYPE, paramName].filter(Boolean).join(',');
    else params[paramName] = rest.join('=').replaceAll('"', '');
  }
  if ((params.ENCODING ?? '').toUpperCase() === 'QUOTED-PRINTABLE')
    value = decodeQuotedPrintable(value);
  return { name, params, value };
}

/** Unescapes `\,`, `\;`, `\n` inside a single value. */
function unescapeText(value: string): string {
  return value
    .replaceAll(/\\n/giu, '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\');
}

/** Splits on unescaped semicolons, for `N` and `ADR`. */
function structured(value: string): string[] {
  return value.split(/(?<!\\);/u).map((part) => unescapeText(part));
}

function labelOf(params: Readonly<Record<string, string>>): string | undefined {
  const type = (params.TYPE ?? '').toLowerCase();
  if (type.includes('work')) return 'Büro';
  if (type.includes('home')) return 'Privat';
  return undefined;
}

/** Reads the vCard 3.0/4.0 subset Foldmark keeps (2.1 leniently). */
export function parseVCard(
  text: string,
  limits: ImportLimits = DEFAULT_IMPORT_LIMITS,
): ContactImportResult {
  const issues: ValidationIssue[] = [];
  if (text.length > limits.maxBytes) {
    return {
      contacts: [],
      issues: [{ severity: 'error', code: 'contactImport.fileTooLarge', path: '' }],
    };
  }
  const tables = countryNames();
  const contacts: ImportedContact[] = [];
  const cards = vCardBlocks(text);
  let skipped = 0;
  for (const [index, lines] of cards.entries()) {
    if (contacts.length >= limits.maxContacts) {
      skipped += 1;
      continue;
    }
    if (lines.join('\n').length > limits.maxEntryBytes) {
      issues.push({
        severity: 'warning',
        code: 'contactImport.entryTooLarge',
        path: `card ${index + 1}`,
      });
      continue;
    }
    const contact = readCard(
      lines.map(parseProperty).filter((p): p is VCardProperty => p !== null),
      tables,
    );
    if (contact) contacts.push(contact);
    else
      issues.push({
        severity: 'warning',
        code: 'contactImport.emptyEntry',
        path: `card ${index + 1}`,
      });
  }
  if (skipped)
    issues.push({
      severity: 'warning',
      code: 'contactImport.tooMany',
      path: '',
      params: { count: skipped },
    });
  if (!cards.length) issues.push({ severity: 'error', code: 'contactImport.noContacts', path: '' });
  return { contacts, issues };
}

function readCard(
  properties: readonly VCardProperty[],
  tables: readonly Intl.DisplayNames[],
): ImportedContact | null {
  const first = (name: string) => properties.find((p) => p.name === name);
  const all = (name: string) => properties.filter((p) => p.name === name);

  const n = first('N') ? structured(first('N')!.value) : [];
  const lastName = clean(n[0]);
  const firstName = clean([n[1], n[2]].filter(Boolean).join(' '));
  const fn = clean(unescapeText(first('FN')?.value ?? ''));
  const org = first('ORG') ? structured(first('ORG')!.value) : [];
  const organization = clean(org[0]);
  const department = clean(org.slice(1).join(' '));
  const displayName =
    fn ?? clean([firstName, lastName].filter(Boolean).join(' ')) ?? organization ?? '';

  const addresses = all('ADR')
    .map((property) => {
      const parts = structured(property.value);
      // ADR: PO box; extended; street; locality; region; postal code; country
      const postal: Record<string, string> = {};
      const street = clean(parts[2]);
      const extended = clean(parts[1]);
      const box = clean(parts[0]);
      if (street) postal.street = street;
      if (extended) postal.addressLine2 = extended;
      else if (box) postal.addressLine2 = box;
      const city = clean(parts[3]);
      const region = clean(parts[4]);
      const postalCode = clean(parts[5], 16);
      const countryCode = resolveCountry(parts[6], tables);
      if (city) postal.city = city;
      if (region) postal.region = region;
      if (postalCode) postal.postalCode = postalCode;
      if (countryCode) postal.countryCode = countryCode;
      const label = labelOf(property.params);
      return Object.keys(postal).length
        ? { ...(label ? { label } : {}), postal: postal as PostalAddress }
        : null;
    })
    .filter((entry): entry is { label?: string; postal: PostalAddress } => entry !== null);

  const emails = dedupe(all('EMAIL').map((p) => clean(unescapeText(p.value))?.toLowerCase()));
  const phones = dedupe(
    all('TEL').map((p) => clean(unescapeText(p.value).replace(/^tel:/iu, ''), 40)),
  );
  const websites = dedupe(all('URL').map((p) => clean(unescapeText(p.value), 200)));
  const notes = clean(unescapeText(first('NOTE')?.value ?? ''), NOTE_MAX);
  const tags = dedupe(
    all('CATEGORIES').flatMap((p) =>
      unescapeText(p.value)
        .split(',')
        .map((tag) => clean(tag, 40)),
    ),
  );
  const externalId = clean(first('UID')?.value, 200);

  if (!displayName && !addresses.length && !emails.length && !phones.length) return null;
  return {
    ...(externalId ? { externalId } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    displayName,
    ...(organization ? { organization } : {}),
    ...(department ? { department } : {}),
    addresses,
    emails,
    phones,
    websites,
    ...(notes ? { notes } : {}),
    tags,
  };
}

function dedupe(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Splits CSV text into rows of cells: quotes, doubled quotes, embedded newlines. */
export function parseCsv(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/u, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim().length));
}

/** The delimiter the header line uses most. */
function detectDelimiter(text: string): ',' | ';' | '\t' {
  const header = text.split(/\r?\n/u)[0] ?? '';
  const counts: [',' | ';' | '\t', number][] = [
    [',', (header.match(/,/gu) ?? []).length],
    [';', (header.match(/;/gu) ?? []).length],
    ['\t', (header.match(/\t/gu) ?? []).length],
  ];
  return counts.sort((left, right) => right[1] - left[1])[0]![0];
}

/** The header names we understand, lower-cased; Google Contacts first, then common others. */
const CSV_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  firstName: ['first name', 'given name', 'vorname'],
  lastName: ['last name', 'family name', 'nachname', 'name'],
  displayName: ['name', 'display name', 'full name', 'anzeigename'],
  organization: [
    'organization name',
    'organization 1 - name',
    'company',
    'organisation',
    'firma',
    'unternehmen',
  ],
  department: ['organization department', 'organization 1 - department', 'department', 'abteilung'],
  notes: ['notes', 'notizen'],
  tags: ['labels', 'group membership', 'categories', 'kategorien'],
  externalId: ['id', 'uid', 'kontakt-id'],
};

/** `Address 1 - Street` and friends: prefix of the address group, then the part. */
const ADDRESS_PARTS: Readonly<Record<string, readonly string[]>> = {
  street: [
    'street',
    'straße',
    'strasse',
    'street address',
    'address 1 - street',
    'home street',
    'business street',
  ],
  addressLine2: [
    'extended address',
    'address 1 - extended address',
    'home street 2',
    'business street 2',
    'adresszeile 2',
  ],
  city: ['city', 'ort', 'stadt', 'address 1 - city', 'home city', 'business city'],
  region: ['region', 'state', 'bundesland', 'address 1 - region', 'home state', 'business state'],
  postalCode: [
    'postal code',
    'plz',
    'postleitzahl',
    'zip',
    'address 1 - postal code',
    'home postal code',
    'business postal code',
  ],
  country: [
    'country',
    'land',
    'address 1 - country',
    'home country/region',
    'business country/region',
    'country/region',
  ],
};

function columnIndex(header: readonly string[], names: readonly string[]): number {
  for (const name of names) {
    const index = header.indexOf(name);
    if (index >= 0) return index;
  }
  return -1;
}

/** Every column whose lower-cased header starts with a prefix, e.g. `e-mail 1 - value`. */
function columnsStartingWith(header: readonly string[], prefixes: readonly string[]): number[] {
  return header
    .map((name, index) => (prefixes.some((prefix) => name.startsWith(prefix)) ? index : -1))
    .filter((index) => index >= 0);
}

/** Reads a Google-compatible CSV, and other CSVs whose headers say what they hold. */
export function parseContactCsv(
  text: string,
  limits: ImportLimits = DEFAULT_IMPORT_LIMITS,
): ContactImportResult {
  const issues: ValidationIssue[] = [];
  if (text.length > limits.maxBytes) {
    return {
      contacts: [],
      issues: [{ severity: 'error', code: 'contactImport.fileTooLarge', path: '' }],
    };
  }
  const rows = parseCsv(text, detectDelimiter(text));
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || !dataRows.length) {
    return {
      contacts: [],
      issues: [{ severity: 'error', code: 'contactImport.noContacts', path: '' }],
    };
  }
  const header = headerRow.map((name) => name.trim().toLowerCase());
  const column = (key: keyof typeof CSV_COLUMNS) => columnIndex(header, CSV_COLUMNS[key]!);
  const addressColumn = (key: keyof typeof ADDRESS_PARTS) =>
    columnIndex(header, ADDRESS_PARTS[key]!);
  const emailColumns = columnsStartingWith(header, ['e-mail', 'email']).filter(
    (i) => !header[i]!.includes('type') && !header[i]!.includes('label'),
  );
  const phoneColumns = columnsStartingWith(header, ['phone', 'telefon', 'mobile', 'tel']).filter(
    (i) => !header[i]!.includes('type') && !header[i]!.includes('label'),
  );
  const websiteColumns = columnsStartingWith(header, [
    'website',
    'web page',
    'url',
    'webseite',
  ]).filter((i) => !header[i]!.includes('type') && !header[i]!.includes('label'));
  const known = [
    column('firstName'),
    column('lastName'),
    column('displayName'),
    column('organization'),
    addressColumn('street'),
    addressColumn('city'),
    ...emailColumns,
  ].some((i) => i >= 0);
  if (!known) {
    return {
      contacts: [],
      issues: [{ severity: 'error', code: 'contactImport.unknownColumns', path: '' }],
    };
  }
  const tables = countryNames();
  const contacts: ImportedContact[] = [];
  let skipped = 0;
  for (const [rowIndex, cells] of dataRows.entries()) {
    if (contacts.length >= limits.maxContacts) {
      skipped += 1;
      continue;
    }
    if (cells.join(',').length > limits.maxEntryBytes) {
      issues.push({
        severity: 'warning',
        code: 'contactImport.entryTooLarge',
        path: `row ${rowIndex + 2}`,
      });
      continue;
    }
    const cell = (index: number) => (index >= 0 ? clean(cells[index]) : undefined);
    const firstName = cell(column('firstName'));
    // `name` may be the display name (Google) or the last name (other exports);
    // it is the last name only when there is no first name column.
    const lastNameIndex =
      column('firstName') >= 0
        ? columnIndex(header, ['last name', 'family name', 'nachname'])
        : column('lastName');
    const lastName = cell(lastNameIndex);
    const organization = cell(column('organization'));
    const displayName =
      cell(column('displayName')) ??
      clean([firstName, lastName].filter(Boolean).join(' ')) ??
      organization ??
      '';
    const postal: Record<string, string> = {};
    const street = cell(addressColumn('street'));
    const line2 = cell(addressColumn('addressLine2'));
    const city = cell(addressColumn('city'));
    const region = cell(addressColumn('region'));
    const postalCode = clean(cells[addressColumn('postalCode')], 16);
    const countryCode = resolveCountry(cells[addressColumn('country')], tables);
    if (street) postal.street = street;
    if (line2) postal.addressLine2 = line2;
    if (city) postal.city = city;
    if (region) postal.region = region;
    if (postalCode) postal.postalCode = postalCode;
    if (countryCode) postal.countryCode = countryCode;
    const emails = dedupe(
      emailColumns.flatMap((i) =>
        (cells[i] ?? '').split(/\s*:::\s*|\s*;\s*/u).map((v) => clean(v)?.toLowerCase()),
      ),
    );
    const phones = dedupe(
      phoneColumns.flatMap((i) =>
        (cells[i] ?? '').split(/\s*:::\s*|\s*;\s*/u).map((v) => clean(v, 40)),
      ),
    );
    const websites = dedupe(
      websiteColumns.flatMap((i) =>
        (cells[i] ?? '').split(/\s*:::\s*|\s*;\s*/u).map((v) => clean(v, 200)),
      ),
    );
    const notes = clean(cells[column('notes')], NOTE_MAX);
    const tags = dedupe(
      (cells[column('tags')] ?? '')
        .split(/\s*:::\s*|\s*,\s*/u)
        .map((tag) => clean(tag.replace(/^\* /u, ''), 40)),
    );
    const department = cell(column('department'));
    const externalId = clean(cells[column('externalId')], 200);
    if (!displayName && !Object.keys(postal).length && !emails.length && !phones.length) {
      issues.push({
        severity: 'warning',
        code: 'contactImport.emptyEntry',
        path: `row ${rowIndex + 2}`,
      });
      continue;
    }
    contacts.push({
      ...(externalId ? { externalId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      displayName,
      ...(organization ? { organization } : {}),
      ...(department ? { department } : {}),
      addresses: Object.keys(postal).length ? [{ postal: postal as PostalAddress }] : [],
      emails,
      phones,
      websites,
      ...(notes ? { notes } : {}),
      tags,
    });
  }
  if (skipped)
    issues.push({
      severity: 'warning',
      code: 'contactImport.tooMany',
      path: '',
      params: { count: skipped },
    });
  return { contacts, issues };
}
