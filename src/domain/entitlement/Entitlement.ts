/**
 * Entitlement levels a visitor can hold.
 *
 * Pure domain: no store, no plugin, no browser API. The decision "is this
 * feature unlocked?" must be unit-testable without any of them.
 */
export const ENTITLEMENTS = ['free', 'pro-lifetime', 'pro-subscription'] as const;

/** One entitlement level, as stored and as compared. */
export type Entitlement = (typeof ENTITLEMENTS)[number];

/**
 * Unknown or missing values degrade to `free` instead of throwing.
 *
 * The safe direction for a cache of a paid state: a lost entitlement can be
 * restored from wherever it was granted, a wrongly granted one cannot be
 * taken back without an angry user.
 */
export function entitlementFromStored(value: string | null | undefined): Entitlement {
  return ENTITLEMENTS.find((candidate) => candidate === value) ?? 'free';
}

/** Any paid entitlement counts as Pro. */
export function isPro(entitlement: Entitlement): boolean {
  return entitlement !== 'free';
}

/** Whether `current` satisfies what a gated feature requires. */
export function satisfies(current: Entitlement, required: Entitlement): boolean {
  return required === 'free' || isPro(current);
}

/**
 * Maps gated feature keys to the entitlement they require.
 *
 * **Fail-open by design:** a key that is not in the catalogue is always
 * unlocked. A typo in a feature key must never lock a visitor out of a core
 * feature — the worst case is that a paid feature stays free until the
 * catalogue is corrected, which is recoverable. The opposite is not.
 */
export type FeatureGates = Readonly<Record<string, Entitlement>>;

/**
 * The catalogue shipped with the template: **empty**.
 *
 * The template gates nothing, so no demo feature teaches a derived app that
 * it is paid. Declare keys here before enforcement is switched on, so call
 * sites and tests already exist when the first paid feature lands:
 *
 * ```ts
 * export const shippedGates: FeatureGates = { 'export.pdf': 'pro-lifetime' };
 * ```
 */
export const shippedGates: FeatureGates = {};

/** Whether `featureKey` is unlocked under `current`. Unknown keys are open. */
export function isFeatureUnlocked(
  featureKey: string,
  current: Entitlement,
  gates: FeatureGates = shippedGates,
): boolean {
  const required = gates[featureKey];
  if (required === undefined) return true;
  return satisfies(current, required);
}
