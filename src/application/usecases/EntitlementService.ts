import type { PurchaseGateway } from '@/application/ports/PurchaseGateway';
import {
  entitlementFromStored,
  isFeatureUnlocked,
  type Entitlement,
  type FeatureGates,
} from '@/domain/entitlement/Entitlement';

/** How the cached entitlement is read and written, so this stays testable. */
export interface EntitlementCache {
  read(): string | null;
  write(entitlement: string, checkedAt: string): boolean;
}

/** What a restore attempt produced, for the view to report. */
export type RestoreOutcome = 'restored' | 'nothing' | 'unavailable';

/**
 * Entitlement state and the one question app code asks about it.
 *
 * **Nothing outside this service branches on the entitlement value.** Views
 * ask `isUnlocked(featureKey)`, so a change in how entitlements are decided
 * touches one place instead of every call site.
 */
export class EntitlementService {
  constructor(
    private readonly gateway: PurchaseGateway,
    private readonly cache: EntitlementCache,
    private readonly gates?: FeatureGates,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** The cached entitlement. Degrades to `free` for anything unreadable. */
  current(): Entitlement {
    return entitlementFromStored(this.cache.read());
  }

  /** Whether a feature is unlocked. Unknown keys stay open (fail-open). */
  isUnlocked(featureKey: string): boolean {
    return isFeatureUnlocked(featureKey, this.current(), this.gates);
  }

  /**
   * Whether a purchase channel is reachable.
   *
   * A throwing gateway degrades to "unavailable" rather than to an error
   * screen: a missing channel is an expected answer here.
   */
  async isPurchaseAvailable(): Promise<boolean> {
    try {
      return await this.gateway.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Asks the channel for an entitlement the visitor already holds.
   *
   * The cache is only written when something was actually restored — a
   * failed call must never downgrade a visitor who legitimately holds Pro.
   */
  async restore(): Promise<RestoreOutcome> {
    let restored: Entitlement;
    try {
      restored = await this.gateway.restore();
    } catch {
      return 'unavailable';
    }
    if (restored === 'free') return 'nothing';
    // Entitlement and timestamp are written together: a timestamp without
    // its entitlement, or the reverse, describes a state that never existed.
    this.cache.write(restored, this.now().toISOString());
    return 'restored';
  }
}
