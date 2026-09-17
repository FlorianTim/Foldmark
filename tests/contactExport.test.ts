import { describe, expect, it } from 'vitest';
import { createAddress, createPostalEntry } from '@/domain/address/Address';
import {
  contactIdFromUid,
  serializeContactCsv,
  serializeContacts,
  serializeVCard,
  serializeVCards,
} from '@/domain/address/export/contactExport';
import { parseContactCsv, parseVCard } from '@/domain/address/import/contactImport';
import { matchSignal } from '@/domain/address/import/contactReview';

/** Change 0042 (R03-004): the directory leaves as vCard or CSV and comes back through the import. */

const now = new Date('2026-09-17T10:00:00.000Z');

const person = createAddress(
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000042',
    displayName: 'Erika Mustermann',
    firstName: 'Erika',
    lastName: 'Mustermann',
    addresses: [
      createPostalEntry(
        {
          label: 'Privat',
          primary: true,
          postal: {
            street: 'Heidestraße 17',
            postalCode: '51147',
            city: 'Köln',
            countryCode: 'DE',
          },
        },
        'p1',
      ),
      createPostalEntry(
        {
          label: 'Büro',
          postal: {
            organization: 'Muster GmbH; Werk 2',
            department: 'Einkauf',
            street: 'Industriestraße 5',
            addressLine2: 'Gebäude C',
            postalCode: '51149',
            city: 'Köln',
            region: 'NRW',
            countryCode: 'DE',
          },
        },
        'p2',
      ),
    ],
    emails: [
      { value: 'erika@example.org', primary: true, label: 'Privat' },
      { value: 'e.mustermann@example.com', primary: false, label: 'Büro' },
    ],
    phones: [{ value: '+49 221 123456', primary: true }],
    websites: [{ value: 'https://example.org/erika', primary: true }],
    notes: 'Kommt, geht;\nbleibt.',
    tags: ['kundin', 'köln'],
    roles: ['favorite'],
  },
  now,
);

const organisation = createAddress(
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000043',
    displayName: 'Stadt Beispielstadt – Bürgeramt',
    postal: {
      organization: 'Stadt Beispielstadt',
      department: 'Bürgeramt',
      street: 'Rathausplatz 1',
      postalCode: '12345',
      city: 'Beispielstadt',
      countryCode: 'DE',
    },
    email: 'amt@example.org',
  },
  now,
);

describe('contact export as vCard', () => {
  it('writes one 4.0 card per contact with the fields the directory holds', () => {
    const card = serializeVCard(person);
    const lines = card.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCARD');
    expect(lines[1]).toBe('VERSION:4.0');
    expect(lines.at(-1)).toBe('END:VCARD');
    expect(card).toContain('UID:urn:foldmark:contact:a1b2c3d4-0000-4000-8000-000000000042');
    expect(card).toContain('FN:Erika Mustermann');
    expect(card).toContain('N:Mustermann;Erika;;;');
    expect(card).toContain('ADR;TYPE=home;PREF=1:;;Heidestraße 17;Köln;;51147;DE');
    expect(card).toContain('ADR;TYPE=work:;Gebäude C;Industriestraße 5;Köln;NRW;51149;DE');
    expect(card).toContain('EMAIL;TYPE=home;PREF=1:erika@example.org');
    expect(card).toContain('TEL;PREF=1:+49 221 123456');
    expect(card).toContain('NOTE:Kommt\\, geht\\;\\nbleibt.');
    expect(card).toContain('CATEGORIES:kundin,köln');
    expect(card).toContain('REV:20260917T100000Z');
    // Roles, visibility and provenance are how this browser uses the entry, not the person.
    expect(card).not.toMatch(/favorite|provenance|manual/u);
  });

  it('names the organisation of the primary postal address', () => {
    const card = serializeVCard(organisation);
    expect(card).toContain('ORG:Stadt Beispielstadt;Bürgeramt');
    expect(card).not.toContain('\r\nN:');
  });

  it('folds long lines and the import unfolds them', () => {
    const long = createAddress(
      { displayName: 'L', notes: 'x'.repeat(200), email: 'l@example.org' },
      now,
    );
    const card = serializeVCard(long);
    for (const line of card.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
    const back = parseVCard(card).contacts[0]!;
    expect(back.notes).toBe('x'.repeat(200));
  });

  it('round-trips through the import, and the import knows the entry it came from', () => {
    const text = serializeVCards([person, organisation]);
    const { contacts, issues } = parseVCard(text);
    expect(issues).toEqual([]);
    expect(contacts).toHaveLength(2);
    const [erika, amt] = contacts;
    expect(erika!.firstName).toBe('Erika');
    expect(erika!.lastName).toBe('Mustermann');
    expect(erika!.addresses.map((entry) => [entry.label, entry.postal])).toEqual([
      [
        'Privat',
        { street: 'Heidestraße 17', city: 'Köln', postalCode: '51147', countryCode: 'DE' },
      ],
      [
        'Büro',
        {
          street: 'Industriestraße 5',
          addressLine2: 'Gebäude C',
          city: 'Köln',
          region: 'NRW',
          postalCode: '51149',
          countryCode: 'DE',
        },
      ],
    ]);
    expect(erika!.emails).toEqual(['erika@example.org', 'e.mustermann@example.com']);
    expect(erika!.phones).toEqual(['+49 221 123456']);
    expect(erika!.websites).toEqual(['https://example.org/erika']);
    expect(erika!.notes).toBe('Kommt, geht; bleibt.');
    expect(erika!.tags).toEqual(['kundin', 'köln']);
    expect(amt!.organization).toBe('Stadt Beispielstadt');
    expect(amt!.department).toBe('Bürgeramt');
    expect(matchSignal(erika!, person)).toBe('external-id');
    expect(matchSignal(erika!, organisation)).toBeNull();
    expect(contactIdFromUid('urn:foldmark:contact:x')).toBe('x');
    expect(contactIdFromUid('urn:uuid:x')).toBeUndefined();
  });

  it('writes nothing for an empty directory', () => {
    expect(serializeVCards([])).toBe('');
    expect(serializeContacts([], 'vcard')).toBe('');
  });
});

describe('contact export as CSV', () => {
  it('writes Google Contacts columns, a byte-order mark and quoted cells', () => {
    const text = serializeContactCsv([person, organisation]);
    expect(text.codePointAt(0)).toBe(0xfeff);
    const [header, first, second, trailing] = text.slice(1).split('\r\n');
    expect(header).toContain('"Name","Given Name","Family Name","Organization 1 - Name"');
    expect(header).toContain('"Address 2 - Street"');
    expect(header).toContain('"E-mail 2 - Value"');
    expect(header).not.toContain('"Address 3 - Street"');
    expect(first).toContain('"Erika Mustermann","Erika","Mustermann"');
    expect(first).toContain('"Kommt, geht; bleibt."');
    expect(second).toContain('"Stadt Beispielstadt","Bürgeramt"');
    expect(trailing).toBe('');
  });

  it('keeps a spreadsheet from reading a cell as a formula', () => {
    const tricky = createAddress(
      { displayName: '=SUM(1)', notes: '+49 is not a formula', email: 'a@example.org' },
      now,
    );
    const text = serializeContactCsv([tricky]);
    expect(text).toContain('" =SUM(1)"');
    expect(text).toContain('" +49 is not a formula"');
    const back = parseContactCsv(text).contacts[0]!;
    expect(back.displayName).toBe('=SUM(1)');
    expect(back.notes).toBe('+49 is not a formula');
  });

  it('round-trips the first address group and every contact point through the import', () => {
    const text = serializeContacts([person, organisation], 'csv');
    const { contacts, issues } = parseContactCsv(text);
    expect(issues).toEqual([]);
    const [erika, amt] = contacts;
    expect(erika!.displayName).toBe('Erika Mustermann');
    expect(erika!.firstName).toBe('Erika');
    expect(erika!.lastName).toBe('Mustermann');
    expect(erika!.addresses[0]!.postal).toEqual({
      street: 'Heidestraße 17',
      city: 'Köln',
      postalCode: '51147',
      countryCode: 'DE',
    });
    expect(erika!.emails).toEqual(['erika@example.org', 'e.mustermann@example.com']);
    expect(erika!.phones).toEqual(['+49 221 123456']);
    expect(erika!.websites).toEqual(['https://example.org/erika']);
    expect(erika!.tags).toEqual(['kundin', 'köln']);
    expect(amt!.organization).toBe('Stadt Beispielstadt');
    expect(amt!.addresses[0]!.postal.street).toBe('Rathausplatz 1');
  });
});
