import { describe, expect, it } from 'vitest';
import { AddressBookService } from '@/application/usecases/AddressBookService';
import {
  createAddress,
  createPostalEntry,
  deriveDisplayName,
  foldText,
  fuzzyMatches,
  normalizeContact,
  paginate,
  searchIndexOf,
  type Address,
} from '@/domain/address/Address';
import { AddressSchema } from '@/domain/address/AddressSchema';
import { countryOptions, searchCountries } from '@/domain/address/countries';
import { senderSnapshotOf } from '@/domain/address/SenderProfile';
import { FakeAddressRepository } from './helpers/fakes';

/** Change 0025: the contact model, its projections, the fuzzy search and the pages. */

/** A record exactly as Foldmark 1.0 wrote it: scalars only, no lists. */
const LEGACY_RECORD = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
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
  phone: '+49 30 1234',
  contactVisibility: {},
  roles: ['normal'],
  tags: ['behörde'],
  provenance: { source: 'manual' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('the contact model', () => {
  it('reads a 1.0 record and derives the lists from its scalars (AC-CONTACT-004)', () => {
    const parsed = AddressSchema.safeParse(LEGACY_RECORD);
    expect(parsed.success).toBe(true);
    const contact = parsed.data as Address;
    expect(contact.addresses).toHaveLength(1);
    expect(contact.addresses[0]).toMatchObject({ primary: true, postal: LEGACY_RECORD.postal });
    expect(contact.emails).toEqual([{ value: 'amt@example.org', primary: true }]);
    expect(contact.phones).toEqual([{ value: '+49 30 1234', primary: true }]);
    expect(contact.websites).toEqual([]);
    // The projections are untouched, so every 1.0 consumer reads the same values.
    expect(contact.postal).toEqual(LEGACY_RECORD.postal);
    expect(contact.email).toBe('amt@example.org');
  });

  it('projects the primary entries onto the scalar fields', () => {
    const home = createPostalEntry({
      postal: { street: 'Gartenweg 2', city: 'Bonn', countryCode: 'DE' },
      label: 'Privat',
    });
    const office = createPostalEntry({
      postal: { organization: 'Beispiel GmbH', street: 'Hafen 9', city: 'Hamburg' },
      label: 'Büro',
      primary: true,
    });
    const contact = createAddress({
      firstName: 'Erika',
      lastName: 'Beispiel',
      addresses: [home, office],
      emails: [
        { value: 'privat@example.org', primary: false },
        { value: 'arbeit@example.org', primary: true },
      ],
      phones: [{ value: '+49 40 1', primary: false }],
    });
    // The primary address, with the person line taken from the name fields.
    expect(contact.postal).toEqual({ ...office.postal, person: 'Erika Beispiel' });
    expect(contact.email).toBe('arbeit@example.org');
    // A list without a marked primary gets its first entry as primary.
    expect(contact.phones[0].primary).toBe(true);
    expect(contact.phone).toBe('+49 40 1');
    expect(contact.displayName).toBe('Erika Beispiel – Beispiel GmbH');
    // Only one primary survives when two are marked.
    const twice = normalizeContact({
      ...contact,
      addresses: contact.addresses.map((entry) => ({ ...entry, primary: true })),
    });
    expect(twice.addresses.filter((entry) => entry.primary)).toHaveLength(1);
    expect(twice.postal).toEqual({ ...home.postal, person: 'Erika Beispiel' });
  });

  it('is idempotent and keeps an e-mail-only contact without a postal block', () => {
    const contact = createAddress({
      lastName: 'Nur Mail',
      emails: [{ value: 'x@y.z', primary: true }],
    });
    expect(contact.addresses).toEqual([]);
    expect(contact.postal).toEqual({});
    expect(normalizeContact(normalizeContact(contact))).toEqual(normalizeContact(contact));
    expect(AddressSchema.safeParse(contact).success).toBe(true);
  });

  it('derives display names for people and organisations', () => {
    expect(deriveDisplayName({ organization: 'Verein', city: 'Köln' })).toBe('Verein – Köln');
    expect(deriveDisplayName({ person: 'Max Muster', organization: 'Firma' })).toBe(
      'Max Muster – Firma',
    );
    expect(
      deriveDisplayName({ firstName: 'Erika', lastName: 'Beispiel', postal: { city: 'Bonn' } }),
    ).toBe('Erika Beispiel');
  });

  it('snapshots the primary address for a document', () => {
    const contact = createAddress({
      displayName: 'Privat',
      addresses: [
        createPostalEntry({ postal: { street: 'A 1', city: 'Alt' } }),
        createPostalEntry({ postal: { street: 'B 2', city: 'Neu' }, primary: true }),
      ],
      roles: ['sender'],
    });
    expect(senderSnapshotOf(contact).postal).toEqual({ street: 'B 2', city: 'Neu' });
  });
});

describe('the directory search', () => {
  const berlin = createAddress({
    firstName: 'Anna',
    lastName: 'Müller',
    addresses: [
      createPostalEntry({ postal: { street: 'Unter den Linden 1', city: 'Berlin' } }),
      createPostalEntry({ postal: { street: 'Seeweg 3', city: 'Potsdam' }, label: 'Wochenende' }),
    ],
    emails: [{ value: 'anna@example.org', primary: true }],
    tags: ['verein'],
    notes: 'Kassenwartin',
  });
  const hamburg = createAddress({
    displayName: 'Hafen GmbH',
    postal: { organization: 'Hafen GmbH', street: 'Kai 4', city: 'Hamburg' },
  });

  it('finds every contact with a Berlin connection, case and accents folded (AC-CONTACT-006)', () => {
    expect(fuzzyMatches(berlin, 'Berlin')).toBe(true);
    expect(fuzzyMatches(hamburg, 'berlin')).toBe(false);
    expect(fuzzyMatches(berlin, 'muller')).toBe(true);
    expect(fuzzyMatches(berlin, 'MÜLLER berlin')).toBe(true);
    expect(fuzzyMatches(berlin, 'potsdam')).toBe(true); // a second address counts
    expect(fuzzyMatches(berlin, 'wochenende')).toBe(true); // its label too
    expect(fuzzyMatches(berlin, 'anna@')).toBe(true);
    expect(fuzzyMatches(berlin, 'verein')).toBe(true);
    expect(fuzzyMatches(berlin, 'kassenwart')).toBe(true);
    expect(fuzzyMatches(berlin, 'seeweg hamburg')).toBe(false); // every term must match
  });

  it('tolerates a typo inside a word and a short abbreviation', () => {
    expect(fuzzyMatches(berlin, 'lindn')).toBe(true);
    expect(fuzzyMatches(berlin, 'ptsdm')).toBe(true);
    expect(fuzzyMatches(hamburg, 'hmbg')).toBe(true);
    expect(fuzzyMatches(hamburg, 'xyz')).toBe(false);
    expect(foldText('Straße Zürich')).toBe('strasse zurich');
  });

  it('indexes every address and e-mail for the stored search tokens', () => {
    const index = searchIndexOf(berlin);
    expect(index).toContain('potsdam');
    expect(index).toContain('anna@example.org');
    expect(index).toContain('kassenwartin');
  });

  it('pages the filtered list and clamps the page number (AC-CONTACT-005)', () => {
    const items = Array.from({ length: 53 }, (_, index) => index);
    expect(paginate(items, 1, 25)).toMatchObject({ page: 1, pages: 3 });
    expect(paginate(items, 3, 25).items).toEqual([50, 51, 52]);
    expect(paginate(items, 9, 25).page).toBe(3);
    expect(paginate(items, 0, 25).page).toBe(1);
    expect(paginate([], 1, 25)).toMatchObject({ page: 1, pages: 1, items: [] });
  });
});

describe('the country combobox search', () => {
  const options = countryOptions('de');

  it('offers Niederlande, Niger and Nigeria for "nie" (AC-CONTACT-003)', () => {
    const names = searchCountries(options, 'nie').map((option) => option.name);
    expect(names[0]).toBe('Niederlande');
    expect(names).toContain('Niger');
    expect(names).toContain('Nigeria');
    expect(names.indexOf('Niger')).toBeLessThan(names.indexOf('Karibische Niederlande'));
  });

  it('matches codes and folded names, and lists the preferred countries first when empty', () => {
    expect(searchCountries(options, 'ch')[0].code).toBe('CH');
    expect(searchCountries(options, 'osterreich')[0].code).toBe('AT');
    expect(
      searchCountries(options, '')
        .map((option) => option.code)
        .slice(0, 3),
    ).toEqual(['DE', 'AT', 'CH']);
    expect(searchCountries(options, 'zzzz')).toEqual([]);
  });
});

describe('AddressBookService with contacts', () => {
  it('stores lists, keeps a scalar-only update coherent and copies without the id', async () => {
    const repository = new FakeAddressRepository();
    const service = new AddressBookService(repository);
    const { address } = await service.add({
      firstName: 'Erika',
      lastName: 'Beispiel',
      addresses: [createPostalEntry({ postal: { city: 'Bonn' }, primary: true })],
      emails: [
        { value: 'a@example.org', primary: true },
        { value: 'b@example.org', primary: false },
      ],
    });
    expect(address.email).toBe('a@example.org');

    // A 1.0-style caller changes the scalar: the list follows.
    const scalar = await service.update(address.id, { email: 'c@example.org' });
    expect(scalar.emails).toEqual([{ value: 'c@example.org', primary: true }]);

    // A list change moves the projection.
    const listed = await service.update(address.id, {
      emails: [
        { value: 'd@example.org', primary: false },
        { value: 'e@example.org', primary: true },
      ],
    });
    expect(listed.email).toBe('e@example.org');

    const copy = await service.duplicate(address.id, (name) => `Kopie von ${name}`);
    expect(copy.id).not.toBe(address.id);
    expect(copy.emails).toHaveLength(2);
    expect((await service.list()).length).toBe(2);
  });
});
