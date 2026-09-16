import {
  InvalidInputError,
  LimitReachedError,
  NotFoundError,
} from '@/application/errors/FoldmarkErrors';
import type { AddressRepository } from '@/application/ports/LibraryRepositories';
import {
  ADDRESS_COLLECTION_MAX_SIZE,
  canSend,
  createAddress,
  hasRole,
  looksLikeDuplicate,
  normalizeContact,
  normalizeRoles,
  orderSenders,
  type Address,
  type AddressRole,
} from '@/domain/address/Address';
import { AddressSchema } from '@/domain/address/AddressSchema';
import type { ImportedContact } from '@/domain/address/import/contactImport';
import {
  importedToAddress,
  mergeContact,
  type ImportDecision,
} from '@/domain/address/import/contactReview';
import { senderProfileFrom, type SenderProfile } from '@/domain/address/SenderProfile';

/**
 * The address book — senders and recipients in one place.
 *
 * Duplicate handling is the decision worth knowing about: the service
 * **reports** likely duplicates and never merges. Two entries that look alike
 * are frequently two real people, and an automatic merge destroys one of them
 * with no way back. A warning next to a Save button costs a second; a silent
 * merge costs an address.
 *
 * Roles with a single holder — `primary`, `home` — are enforced here rather than
 * in the repository, because "the primary address" is a statement about the
 * whole book and the repository only ever sees one row.
 */
export class AddressBookService {
  public constructor(private readonly addresses: AddressRepository) {}

  /** Every stored address. */
  public list(): Promise<readonly Address[]> {
    return this.addresses.list();
  }

  /** Addresses matching a free-text query. An empty query lists everything. */
  public search(query: string, limit = 50): Promise<readonly Address[]> {
    const trimmed = query.trim();
    return trimmed ? this.addresses.search(trimmed, limit) : this.addresses.list();
  }

  /** One address, or `null`. */
  public get(id: string): Promise<Address | null> {
    return this.addresses.get(id);
  }

  /**
   * Stores a new address and reports entries that look like the same recipient.
   *
   * @throws {LimitReachedError} When the address book is full.
   */
  public async add(
    input: Parameters<typeof createAddress>[0],
  ): Promise<{ address: Address; possibleDuplicates: readonly Address[] }> {
    const existing = await this.addresses.list();
    if (existing.length >= ADDRESS_COLLECTION_MAX_SIZE) {
      throw new LimitReachedError('address', ADDRESS_COLLECTION_MAX_SIZE);
    }
    const address = await this.withExclusiveRoles(createAddress(input), existing);
    this.assertValid(address);
    const possibleDuplicates = existing.filter((candidate) =>
      looksLikeDuplicate(address, candidate),
    );
    await this.addresses.save(address);
    return { address, possibleDuplicates };
  }

  /**
   * Applies changes to a stored address.
   *
   * @throws {NotFoundError} When the address is gone.
   */
  public async update(
    id: string,
    changes: Partial<Omit<Address, 'id' | 'createdAt' | 'updatedAt'>>,
    now = new Date(),
  ): Promise<Address> {
    const current = await this.addresses.get(id);
    if (!current) throw new NotFoundError('address');
    // A change to the lists wins over a stale scalar; a change to a scalar
    // alone (a 1.0 caller) replaces the list of that kind.
    const scalarOnly = (
      key: 'email' | 'phone' | 'website',
      list: 'emails' | 'phones' | 'websites',
    ) => (key in changes && !(list in changes) ? { [list]: [] } : {});
    const merged: Address = normalizeContact({
      ...current,
      ...changes,
      ...('postal' in changes && !('addresses' in changes) ? { addresses: [] } : {}),
      ...scalarOnly('email', 'emails'),
      ...scalarOnly('phone', 'phones'),
      ...scalarOnly('website', 'websites'),
      updatedAt: now.toISOString(),
    });
    const roles = normalizeRoles(merged.roles);
    const next = await this.withExclusiveRoles(
      {
        ...merged,
        roles,
        stationery: canSend({ ...merged, roles })
          ? (merged.stationery ?? { footerLines: [], letterhead: [] })
          : undefined,
      },
      await this.addresses.list(),
    );
    this.assertValid(next);
    await this.addresses.save(next);
    return next;
  }

  /**
   * Stores the outcome of an import review (R14-013): one decision per
   * imported contact — skip, merge into the matched entry, or add as new. The
   * review happened in the domain and the person confirmed it; this only
   * writes. The collection limit holds for the sum.
   *
   * @throws {LimitReachedError} When the additions would exceed the address book's size.
   */
  public async importContacts(
    decisions: readonly {
      readonly contact: ImportedContact;
      readonly decision: ImportDecision;
      /** The directory entry a merge goes into. */
      readonly matchId?: string;
    }[],
    now = new Date(),
  ): Promise<{ added: number; merged: number; skipped: number }> {
    const existing = await this.addresses.list();
    const additions = decisions.filter((entry) => entry.decision === 'new').length;
    if (existing.length + additions > ADDRESS_COLLECTION_MAX_SIZE) {
      throw new LimitReachedError('address', ADDRESS_COLLECTION_MAX_SIZE);
    }
    const timestamp = now.toISOString();
    const counts = { added: 0, merged: 0, skipped: 0 };
    for (const entry of decisions) {
      if (entry.decision === 'new') {
        const address = createAddress(importedToAddress(entry.contact, timestamp), now);
        this.assertValid(address);
        await this.addresses.save(address);
        counts.added += 1;
      } else if (entry.decision === 'merge' && entry.matchId) {
        const current = await this.addresses.get(entry.matchId);
        if (!current) {
          counts.skipped += 1;
          continue;
        }
        const merged = normalizeContact(mergeContact(current, entry.contact, timestamp));
        this.assertValid(merged);
        await this.addresses.save(merged);
        counts.merged += 1;
      } else {
        counts.skipped += 1;
      }
    }
    return counts;
  }

  /** Adds or removes one role. `primary` and `home` move from their previous holder. */
  public async setRole(id: string, role: AddressRole, on: boolean): Promise<Address> {
    const current = await this.addresses.get(id);
    if (!current) throw new NotFoundError('address');
    const roles = on
      ? [...current.roles, role]
      : current.roles.filter((candidate) => candidate !== role);
    return this.update(id, { roles: normalizeRoles(roles) });
  }

  /** A copy of an address, named as such, without the single-holder roles. */
  public async duplicate(id: string, copyName: (name: string) => string): Promise<Address> {
    const current = await this.addresses.get(id);
    if (!current) throw new NotFoundError('address');
    // A copy is a new record: no id, no timestamps, no use history.
    const fresh: Record<string, unknown> = { ...current };
    for (const key of ['id', 'createdAt', 'updatedAt', 'lastUsedAt']) delete fresh[key];
    const { address } = await this.add({
      ...(fresh as Parameters<typeof createAddress>[0]),
      displayName: copyName(current.displayName),
      roles: current.roles.filter((role) => role !== 'primary' && role !== 'home'),
      provenance: { source: 'manual' },
    });
    return address;
  }

  /** Records that an address was just written into a document. */
  public async touch(id: string, now = new Date()): Promise<void> {
    const current = await this.addresses.get(id);
    if (!current) return;
    await this.addresses.save({ ...current, lastUsedAt: now.toISOString() });
  }

  /** Removes one address. Documents that already embed it keep what they show. */
  public remove(id: string): Promise<void> {
    return this.addresses.delete(id);
  }

  /** Removes the whole address book. */
  public clearAddresses(): Promise<void> {
    return this.addresses.clear();
  }

  /** Every address that can act as a sender, in picker order, as the renderer sees it. */
  public async listSenders(locale = 'de'): Promise<readonly SenderProfile[]> {
    return orderSenders(await this.addresses.list(), locale).map(senderProfileFrom);
  }

  /** The renderer's view of one sender-capable address, or `null`. */
  public async getSender(id: string): Promise<SenderProfile | null> {
    const address = await this.addresses.get(id);
    return address && canSend(address) ? senderProfileFrom(address) : null;
  }

  /** The primary address, or `null` when none is marked. */
  public async primary(): Promise<Address | null> {
    const all = await this.addresses.list();
    return all.find((address) => hasRole(address, 'primary')) ?? null;
  }

  /**
   * Strips `primary` and `home` from whoever held them before, so the book
   * never has two of either. The previous holders are saved here; the caller
   * saves the address itself.
   */
  private async withExclusiveRoles(
    address: Address,
    existing: readonly Address[],
  ): Promise<Address> {
    for (const role of ['primary', 'home'] as const) {
      if (!hasRole(address, role)) continue;
      for (const other of existing) {
        if (other.id === address.id || !hasRole(other, role)) continue;
        await this.addresses.save({
          ...other,
          roles: normalizeRoles(other.roles.filter((candidate) => candidate !== role)),
        });
      }
    }
    return address;
  }

  private assertValid(address: Address): void {
    const parsed = AddressSchema.safeParse(address);
    if (!parsed.success) throw new InvalidInputError(parsed.error.issues[0]?.path.join('.'));
  }
}
