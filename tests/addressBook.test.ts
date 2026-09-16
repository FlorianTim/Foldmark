import { describe, expect, it } from 'vitest';
import {
  createAddress,
  groupByInitial,
  matchesQuery,
  normalizeRoles,
  orderSenders,
  suggestAddresses,
} from '@/domain/address/Address';
import { countryOptions } from '@/domain/address/countries';
import {
  addressFromLegacySender,
  createSenderProfile,
  senderProfileFrom,
  senderProfileFromSnapshot,
  senderSnapshotOf,
} from '@/domain/address/SenderProfile';

const at = (iso: string) => new Date(iso);

describe('address roles', () => {
  it('imply sender for primary and home, and drop "normal" beside any other role', () => {
    expect(normalizeRoles(['primary'])).toEqual(['primary', 'sender']);
    expect(normalizeRoles(['home', 'normal'])).toEqual(['home', 'sender']);
    expect(normalizeRoles(['favorite', 'favorite'])).toEqual(['favorite']);
    expect(normalizeRoles([])).toEqual(['normal']);
  });

  it('gives a sender-capable address stationery to fill', () => {
    expect(createAddress({ postal: { city: 'Berlin' }, roles: ['sender'] }).stationery).toEqual({
      footerLines: [],
      letterhead: [],
    });
    expect(createAddress({ postal: { city: 'Berlin' } }).stationery).toBeUndefined();
  });
});

describe('sender ordering', () => {
  const primary = createAddress({ displayName: 'Zuletzt', postal: {}, roles: ['primary'] });
  const home = createAddress({ displayName: 'Privat', postal: {}, roles: ['home'] });
  const recent = createAddress(
    { displayName: 'Verein', postal: {}, roles: ['sender'] },
    at('2026-01-01T00:00:00Z'),
  );
  const favourite = createAddress({
    displayName: 'Büro',
    postal: {},
    roles: ['sender', 'favorite'],
  });
  const recipientOnly = createAddress({ displayName: 'Amt', postal: {} });

  it('offers primary, home, favourites, then the rest by use and name', () => {
    const used = { ...recent, lastUsedAt: '2026-09-01T00:00:00.000Z' };
    const older = createAddress({ displayName: 'Alt', postal: {}, roles: ['sender'] });
    const ordered = orderSenders([older, used, favourite, recipientOnly, home, primary], 'de');
    expect(ordered.map((a) => a.displayName)).toEqual([
      'Zuletzt',
      'Privat',
      'Büro',
      'Verein',
      'Alt',
    ]);
  });

  it('suggests about ten addresses with primary and home pinned first', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      createAddress({ displayName: `Adresse ${String(index).padStart(2, '0')}`, postal: {} }),
    );
    const suggested = suggestAddresses([...many, home, primary], 'de');
    expect(suggested).toHaveLength(10);
    expect(suggested[0]).toBe(primary);
    expect(suggested[1]).toBe(home);
  });
});

describe('address book listing', () => {
  it('groups alphabetically with a locale-aware collation and "#" for the rest', () => {
    const groups = groupByInitial(
      [
        createAddress({ displayName: 'Österreich AG', postal: {} }),
        createAddress({ displayName: 'anna', postal: {} }),
        createAddress({ displayName: 'Beispiel GmbH', postal: {} }),
        createAddress({ displayName: '42 Design', postal: {} }),
      ],
      'de',
    );
    expect(groups.map((group) => group.initial)).toEqual(['A', 'B', 'Ö', '#']);
    expect(groups[0].addresses[0].displayName).toBe('anna');
  });

  it('matches every typed term somewhere in the address', () => {
    const address = createAddress({
      displayName: 'Stadt Beispielstadt',
      postal: { street: 'Rathausplatz 1', city: 'Beispielstadt' },
    });
    expect(matchesQuery(address, 'stadt rathaus')).toBe(true);
    expect(matchesQuery(address, 'stadt bremen')).toBe(false);
  });

  it('lists countries locally, preferred ones first, the rest alphabetically', () => {
    const options = countryOptions('de');
    expect(options.slice(0, 3).map((option) => option.code)).toEqual(['DE', 'AT', 'CH']);
    expect(options.length).toBeGreaterThan(200);
    expect(options.find((option) => option.code === 'FR')?.name).toBe('Frankreich');
  });
});

describe('sender snapshots (ADR 0017)', () => {
  const address = createAddress({
    displayName: 'Privat',
    postal: { person: 'Max Beispiel', street: 'Weg 1', postalCode: '10115', city: 'Berlin' },
    email: 'max@example.org',
    phone: '030 1234',
    contactVisibility: { email: true },
    roles: ['primary'],
    stationery: { footerLines: ['IBAN DE00'], letterhead: [], defaultSignatureId: undefined },
  });

  it('copies only the contact details the address releases', () => {
    const snapshot = senderSnapshotOf(address);
    expect(snapshot).toEqual({
      name: 'Privat',
      postal: address.postal,
      email: 'max@example.org',
      phone: undefined,
      website: undefined,
      footerLines: ['IBAN DE00'],
    });
  });

  it('survives the source being edited or deleted', () => {
    const snapshot = senderSnapshotOf(address);
    const edited = { ...address, displayName: 'Umbenannt', postal: { city: 'Bremen' } };
    expect(senderProfileFromSnapshot(snapshot, edited).name).toBe('Privat');
    expect(senderProfileFromSnapshot(snapshot, edited).postal.city).toBe('Berlin');
    expect(senderProfileFromSnapshot(snapshot, null).letterhead).toEqual([]);
  });

  it('projects a legacy sender identity into an address and back without loss', () => {
    const legacy = createSenderProfile({
      name: 'Verein',
      postal: { organization: 'Beispiel e.V.' },
      email: 'info@example.org',
      footerLines: ['Register 1'],
    });
    const migrated = addressFromLegacySender(legacy);
    expect(migrated.roles).toEqual(['sender']);
    expect(senderProfileFrom(migrated)).toEqual({ ...legacy, name: 'Verein' });
  });
});
