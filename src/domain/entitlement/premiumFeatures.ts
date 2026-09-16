/**
 * Foldmark's premium features as stable ids with a state per use (C10–C12,
 * change 0039; research change 0038 owns the licence model).
 *
 * Premium is feature gating first, not a shop. A feature has an optional free
 * allowance; beyond it the state is what the current **phase** says. During
 * the test phase everything is `beta-free` — usable, and marked as premium
 * so nobody is surprised later. A `live` phase would return `locked` without
 * a licence; nothing reads it yet, and no provider issues licences. Use cases
 * ask `featureState` themselves: a disabled button is not a control.
 *
 * Counters are the caller's: they count successful actions (a saved template,
 * a generated code), never the opening of a dialog. They live in this browser
 * and can be edited by whoever owns it; that is stated, not hidden.
 */

/** The premium feature ids. Stable: they are what a licence later names. */
export type PremiumFeatureId =
  | 'template.custom.save'
  | 'template.custom.multiple'
  | 'template.pack.health'
  | 'qr.generate'
  | 'qr.style'
  | 'export.docx'
  | 'export.odt'
  | 'theme.custom'
  | 'letterhead.advanced'
  | 'package.encryption';

/** What a feature is to this installation right now. */
export interface FeatureEntitlement {
  readonly mode: 'free' | 'beta-free' | 'quota' | 'licensed' | 'locked';
  /** Successful uses so far, for a feature with an allowance. */
  readonly used?: number;
  /** The free allowance, for a feature that has one. */
  readonly limit?: number;
}

/** The phase the app is in. The test phase gates nothing. */
export type PremiumPhase = 'beta' | 'live';

/** The phase this build is in. */
export const PREMIUM_PHASE: PremiumPhase = 'beta';

/**
 * Every premium feature and its free allowance. A feature without a limit
 * is premium from the first use; one with a limit is free up to it. The
 * numbers are product configuration, not UI constants.
 */
export const PREMIUM_FEATURES: Readonly<Record<PremiumFeatureId, { readonly freeLimit?: number }>> =
  Object.freeze({
    'template.custom.save': { freeLimit: Number.POSITIVE_INFINITY },
    'template.custom.multiple': { freeLimit: 1 },
    'template.pack.health': {},
    'qr.generate': { freeLimit: 5 },
    'qr.style': {},
    'export.docx': {},
    'export.odt': {},
    'theme.custom': {},
    'letterhead.advanced': {},
    'package.encryption': {},
  });

/**
 * The state of a feature given how often it was used successfully.
 *
 * Within the free allowance it is `free`; beyond it the phase decides:
 * `beta-free` during the test phase, `locked` live without a licence.
 */
export function featureState(
  feature: PremiumFeatureId,
  used = 0,
  phase: PremiumPhase = PREMIUM_PHASE,
): FeatureEntitlement {
  const limit = PREMIUM_FEATURES[feature].freeLimit;
  if (limit === Number.POSITIVE_INFINITY) return { mode: 'free' };
  const counted = limit === undefined ? {} : { used, limit };
  if (limit !== undefined && used < limit) return { mode: 'free', ...counted };
  return { mode: phase === 'beta' ? 'beta-free' : 'locked', ...counted };
}

/** Whether the feature may be used now — `locked` is the only refusal. */
export function canUseFeature(state: FeatureEntitlement): boolean {
  return state.mode !== 'locked';
}
