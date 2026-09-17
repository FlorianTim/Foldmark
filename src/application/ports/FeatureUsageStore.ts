import type { PremiumFeatureId } from '@/domain/entitlement/premiumFeatures';

/**
 * Counters for premium features with a free allowance (C11, change 0040).
 *
 * A counter records successful actions — a generated code, an export that
 * completed — never the opening of a dialog. It lives in this browser, next
 * to the preferences, and whoever owns the browser can edit it; the gate is
 * a product rule, not a lock. Synchronous, because the settings storage is.
 */
export interface FeatureUsageStore {
  /** Successful uses so far; `0` when nothing was recorded. */
  read(feature: PremiumFeatureId): number;
  /** Records one more successful use and returns the new count. */
  increment(feature: PremiumFeatureId): number;
}
