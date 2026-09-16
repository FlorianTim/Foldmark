import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AddressBookService } from '@/application/usecases/AddressBookService';
import { createAddress } from '@/domain/address/Address';
import {
  detectContactFile,
  parseContactCsv,
  parseContactFile,
  parseCsv,
  parseVCard,
} from '@/domain/address/import/contactImport';
import {
  mergeContact,
  normalizeName,
  normalizePhone,
  reviewImport,
} from '@/domain/address/import/contactReview';
import { FakeAddressRepository } from './helpers/fakes';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'contacts');
// Two fixed fixture files; the name is one of two literals, never input.
const fixture = (name: 'sample.vcf' | 'google.csv'): string =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(join(FIXTURES, name), 'utf8');

describe('reading contact files (R14-013)', () => {
  it('tells vCard from CSV from noise', () => {
    expect(detectContactFile('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD')).toBe('vcard');
    expect(detectContactFile('﻿Name,E-mail\nA,a@b.c')).toBe('csv');
    expect(detectContactFile('# just a note')).toBe('unknown');
    expect(parseContactFile('# just a note').issues[0]?.code).toBe('contactImport.unknownFormat');
  });

  it('reads vCard 3.0, 4.0 and a quoted-printable 2.1 card, and skips an empty one', () => {
    const { contacts, issues } = parseVCard(fixture('sample.vcf'));
    expect(contacts).toHaveLength(3);
    expect(issues.map((issue) => issue.code)).toEqual(['contactImport.emptyEntry']);

    const [erika, max, anna] = contacts;
    expect(erika).toMatchObject({
      externalId: 'urn:uuid:11111111-1111-4111-8111-111111111111',
      firstName: 'Erika',
      lastName: 'Beispiel',
      displayName: 'Dr. Erika Beispiel',
      organization: 'Muster GmbH',
      department: 'Einkauf',
      emails: ['erika.beispiel@example.org'],
      phones: ['+49 170 1234567'],
      websites: ['https://example.org/erika'],
      notes: 'Kennt sich mit Formularen aus, sehr hilfsbereit.',
      tags: ['Kunden', 'Berlin'],
    });
    expect(erika?.addresses).toEqual([
      {
        label: 'Büro',
        postal: {
          street: 'Beispielstraße 12',
          city: 'Berlin',
          postalCode: '12345',
          countryCode: 'DE',
        },
      },
      {
        label: 'Privat',
        postal: {
          street: 'Gartenweg 3',
          city: 'Potsdam',
          region: 'Brandenburg',
          postalCode: '14467',
          countryCode: 'DE',
        },
      },
    ]);
    expect(max).toMatchObject({
      displayName: 'Max Mustermann',
      emails: ['max@example.de'],
      phones: ['+49-30-555-0100'],
    });
    expect(max?.addresses[0]?.postal.countryCode).toBe('DE');
    expect(anna).toMatchObject({
      firstName: 'Anna',
      lastName: 'Müller',
      displayName: 'Anna Müller',
    });
    expect(anna?.addresses[0]?.postal).toEqual({
      street: 'Lange Straße 5',
      city: 'Köln',
      postalCode: '50667',
      countryCode: 'DE',
    });
  });

  it('reads a Google Contacts CSV: names, organisation, one address, several e-mails', () => {
    const { contacts, issues } = parseContactCsv(fixture('google.csv'));
    expect(issues).toEqual([]);
    expect(contacts).toHaveLength(3);
    expect(contacts[0]).toMatchObject({
      firstName: 'Erika',
      lastName: 'Beispiel',
      displayName: 'Erika Beispiel',
      organization: 'Muster GmbH',
      department: 'Einkauf',
      emails: ['erika.beispiel@example.org', 'erika@home.example'],
      phones: ['+49 170 1234567'],
      websites: ['https://example.org/erika'],
      tags: ['myContacts', 'Kunden'],
      notes: 'Kennt sich aus, "sehr" hilfsbereit',
    });
    expect(contacts[0]?.addresses).toEqual([
      {
        postal: {
          street: 'Beispielstraße 12',
          city: 'Berlin',
          postalCode: '12345',
          countryCode: 'DE',
        },
      },
    ]);
    // An organisation without a person still has a name.
    expect(contacts[2]?.displayName).toBe('Stadtverwaltung Beispielstadt');
    expect(contacts[2]?.addresses[0]?.postal.countryCode).toBe('DE');
  });

  it('parses CSV with quotes, doubled quotes, semicolons and embedded newlines', () => {
    expect(parseCsv('a,"b, c","d ""e""",f\n1,2,"3\n4",5\n', ',')).toEqual([
      ['a', 'b, c', 'd "e"', 'f'],
      ['1', '2', '3\n4', '5'],
    ]);
    expect(parseCsv('Name;Ort\nA;B\n', ';')).toEqual([
      ['Name', 'Ort'],
      ['A', 'B'],
    ]);
  });

  it('refuses what it cannot read and bounds what it does', () => {
    expect(parseContactCsv('Foo,Bar\n1,2\n').issues[0]?.code).toBe('contactImport.unknownColumns');
    expect(
      parseVCard('x'.repeat(10), { maxBytes: 5, maxContacts: 5, maxEntryBytes: 5 }).issues[0]?.code,
    ).toBe('contactImport.fileTooLarge');
    const many = Array.from({ length: 3 }, (_, i) => `BEGIN:VCARD\nFN:P${i}\nEND:VCARD`).join('\n');
    const limited = parseVCard(many, { maxBytes: 10_000, maxContacts: 2, maxEntryBytes: 10_000 });
    expect(limited.contacts).toHaveLength(2);
    expect(limited.issues[0]).toMatchObject({
      code: 'contactImport.tooMany',
      params: { count: 1 },
    });
    // Control characters and HTML are text or gone; nothing is interpreted.
    const nasty = parseVCard('BEGIN:VCARD\nFN:<script>alert(1)</script> Bob\nEND:VCARD');
    expect(nasty.contacts[0]?.displayName).toBe('<script>alert(1)</script> Bob');
  });
});

describe('reviewing an import against the directory', () => {
  const existing = [
    createAddress({
      displayName: 'Dr. Erika Beispiel',
      firstName: 'Erika',
      lastName: 'Beispiel',
      postal: { street: 'Beispielstraße 12', postalCode: '12345', city: 'Berlin' },
      emails: [{ value: 'Erika.Beispiel@example.org', primary: true }],
      provenance: { source: 'manual' },
      id: 'existing-erika',
    }),
    createAddress({
      displayName: 'Max Mustermann',
      firstName: 'Max',
      lastName: 'Mustermann',
      postal: { postalCode: '99999', city: 'Anderswo' },
      phones: [{ value: '0049 30 5550100', primary: true }],
      provenance: { source: 'imported-file', origin: 'ext-max' },
      id: 'existing-max',
    }),
    createAddress({
      displayName: 'Anna Müller',
      firstName: 'Anna',
      lastName: 'Müller',
      postal: { postalCode: '10115', city: 'Berlin' },
      id: 'existing-anna',
    }),
  ];

  it('normalises what it compares', () => {
    expect(normalizePhone('+49 (0)30 / 555-0100')).toBe('+490305550100');
    expect(normalizePhone('0049 30 5550100')).toBe('+49305550100');
    expect(normalizeName('  Anna   MÜLLER ')).toBe('anna muller');
  });

  it('groups by the strongest signal and never merges on its own', () => {
    const { contacts } = parseVCard(fixture('sample.vcf'));
    const review = reviewImport(
      [
        ...contacts,
        {
          displayName: 'Max Mustermann',
          externalId: 'ext-max',
          addresses: [],
          emails: [],
          phones: [],
          websites: [],
          tags: [],
        },
        {
          displayName: 'Anna Müller',
          addresses: [{ postal: { postalCode: '20095' } }],
          emails: [],
          phones: [],
          websites: [],
          tags: [],
        },
        {
          displayName: 'Neue Person',
          addresses: [],
          emails: ['neu@example.org'],
          phones: [],
          websites: [],
          tags: [],
        },
      ],
      existing,
    );
    expect(
      review.entries.map((entry) => [entry.signal, entry.group, entry.defaultDecision]),
    ).toEqual([
      ['email', 'existing', 'skip'],
      ['phone', 'existing', 'skip'],
      ['name', 'review', 'new'],
      ['external-id', 'existing', 'skip'],
      ['name', 'review', 'new'],
      [null, 'new', 'new'],
    ]);
    expect(review.counts).toEqual({ new: 1, existing: 3, review: 2 });
    expect(review.entries[0]?.match?.id).toBe('existing-erika');
  });

  it('matches a name at the same postal code as probably existing', () => {
    const review = reviewImport(
      [
        {
          displayName: 'Anna Müller',
          addresses: [{ postal: { postalCode: '10115' } }],
          emails: [],
          phones: [],
          websites: [],
          tags: [],
        },
      ],
      existing,
    );
    expect(review.entries[0]).toMatchObject({ signal: 'name-postal-code', group: 'existing' });
  });

  it('merges by adding, never overwriting', () => {
    const [erika] = parseVCard(fixture('sample.vcf')).contacts;
    if (!erika) throw new Error('fixture');
    const merged = mergeContact(existing[0]!, erika, '2026-09-16T10:00:00.000Z');
    // The known Berlin address is not doubled; Potsdam is added, not primary.
    expect(merged.addresses.map((entry) => [entry.postal.city, entry.primary])).toEqual([
      ['Berlin', true],
      ['Potsdam', false],
    ]);
    expect(merged.emails.map((point) => point.value)).toEqual(['Erika.Beispiel@example.org']);
    expect(merged.phones.map((point) => point.value)).toEqual(['+49 170 1234567']);
    expect(merged.tags).toEqual(['Kunden', 'Berlin']);
    expect(merged.notes).toBe(erika.notes);
    expect(merged.provenance).toMatchObject({ source: 'manual', origin: erika.externalId });
    expect(merged.displayName).toBe('Dr. Erika Beispiel');
  });

  it('stores the decisions through the service with provenance', async () => {
    const repository = new FakeAddressRepository();
    const service = new AddressBookService(repository);
    for (const address of existing) await repository.save(address);
    const { contacts } = parseVCard(fixture('sample.vcf'));
    const [erika, max, anna] = contacts;
    if (!erika || !max || !anna) throw new Error('fixture');
    const counts = await service.importContacts([
      { contact: erika, decision: 'merge', matchId: 'existing-erika' },
      { contact: max, decision: 'skip' },
      { contact: anna, decision: 'new' },
    ]);
    expect(counts).toEqual({ added: 1, merged: 1, skipped: 1 });
    const all = await repository.list();
    expect(all).toHaveLength(4);
    const added = all.find(
      (address) => address.displayName === 'Anna Müller' && address.id !== 'existing-anna',
    );
    expect(added?.provenance).toMatchObject({ source: 'imported-file' });
    expect(added?.addresses[0]?.postal.city).toBe('Köln');
    expect((await repository.get('existing-erika'))?.addresses).toHaveLength(2);
  });
});
