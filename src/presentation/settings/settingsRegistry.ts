import { readPreference, writePreference, preferenceKey } from '@/presentation/browserStorage';

/**
 * One persisted UI preference: key, default, and how it is encoded.
 *
 * Why a declarative definition instead of ad-hoc `readPreference` calls:
 *
 * - **One place per setting.** Key, default and encoding cannot drift apart
 *   across a read site and a write site.
 * - **Enumerable.** "Which settings exist?" becomes answerable — needed for
 *   the diagnostics view and for resetting them all. Scattered calls can
 *   only be found by grepping.
 * - **A migration hook has somewhere to live.** When a stored format
 *   changes, `decode` is the single place that has to understand the old one.
 *
 * `decode` must never throw. A value written by a newer build, or a corrupted
 * one, has to degrade to `defaultValue` — a preference must never be able to
 * stop the app from rendering. Return `null` to say "unusable, take the
 * default".
 */
export interface SettingDefinition<T> {
  readonly key: string;
  readonly defaultValue: T;
  readonly decode: (raw: string) => T | null;
  readonly encode: (value: T) => string;
}

/**
 * The non-generic face of a definition, so the registry can list settings of
 * different value types without losing type safety on `encode`.
 */
export interface SettingDescriptor {
  readonly key: string;
  /** The default in its **stored** form, for the diagnostics view. */
  readonly encodedDefault: string;
}

/** Reads the current value, falling back to the default. */
export function readSetting<T>(definition: SettingDefinition<T>): T {
  const raw = readPreference(definition.key);
  if (raw === null) return definition.defaultValue;
  const decoded = definition.decode(raw);
  return decoded === null ? definition.defaultValue : decoded;
}

/** Persists a value. Returns whether persistence succeeded. */
export function writeSetting<T>(definition: SettingDefinition<T>, value: T): boolean {
  return writePreference(definition.key, definition.encode(value));
}

/** Describes a definition for enumeration without exposing its value type. */
export function describe<T>(definition: SettingDefinition<T>): SettingDescriptor {
  return { key: definition.key, encodedDefault: definition.encode(definition.defaultValue) };
}

const identity = (raw: string): string => raw;

function oneOf<T extends string>(allowed: readonly T[]): SettingDefinition<T>['decode'] {
  return (raw: string) => (allowed.some((candidate) => candidate === raw) ? (raw as T) : null);
}

/** Stored form of the boolean settings — literal words, never `1`/`0`. */
const decodeBoolean = (raw: string): boolean | null =>
  raw === 'true' ? true : raw === 'false' ? false : null;
const encodeBoolean = (value: boolean): string => (value ? 'true' : 'false');

/** ISO-8601 in UTC; an unparseable value degrades to "never". */
const decodeTimestamp = (raw: string): string | null =>
  Number.isNaN(Date.parse(raw)) ? null : new Date(raw).toISOString();

/** Locales the template ships. Anything else degrades to the default. */
export const LOCALE_IDS = ['de', 'en'] as const;

/** Stable stored forms of the entitlement levels, never an index. */
export const ENTITLEMENT_IDS = ['free', 'pro-lifetime', 'pro-subscription'] as const;

/**
 * Stable identifiers for the local CSS-token themes.
 *
 * They live in the registry rather than next to the theme composable because
 * the registry is what decides which stored values are acceptable — keeping
 * the list and the setting apart is how a theme gets renamed in one place
 * and silently rejected in the other.
 */
export const THEME_IDS = [
  'system',
  'light',
  'dark',
  'paper',
  'sepia',
  'high-contrast',
  'ocean',
] as const;

/** Identifier accepted by the theme controller. */
export type ThemeId = (typeof THEME_IDS)[number];

/**
 * Every persisted preference this app defines, in one place.
 *
 * Add a setting here, not next to the component that reads it. `allSettings`
 * is what makes the set enumerable — the diagnostics view and
 * `resetAllSettings` walk it instead of hardcoding a second list that
 * silently falls behind.
 */
export const appSettings = {
  locale: {
    key: 'locale',
    defaultValue: 'de',
    decode: oneOf(LOCALE_IDS),
    encode: identity,
  } satisfies SettingDefinition<(typeof LOCALE_IDS)[number]>,

  theme: {
    key: 'theme',
    defaultValue: 'system',
    decode: oneOf(THEME_IDS),
    encode: identity,
  } satisfies SettingDefinition<ThemeId>,

  /**
   * Whether the first-visit intro has been finished or skipped.
   *
   * The storage key stays `privacy-notice-v1` on purpose: visitors who
   * already accepted the earlier privacy notice must not be shown the intro
   * again just because it grew extra steps.
   *
   * The default is `false`, and anything unreadable degrades to it — showing
   * an introduction once too often is recoverable, hiding it from a
   * first-time visitor is not.
   */
  introCompleted: {
    key: 'privacy-notice-v1',
    defaultValue: false,
    // 'accepted' is the value the pre-intro privacy notice wrote.
    decode: (raw: string) => (raw === 'accepted' ? true : decodeBoolean(raw)),
    encode: (value: boolean) => (value ? 'accepted' : encodeBoolean(false)),
  } satisfies SettingDefinition<boolean>,

  /**
   * Locally cached entitlement.
   *
   * A **cache**, never proof of payment. Unknown values degrade to `free`:
   * a lost entitlement can be restored, a wrongly granted one cannot be taken
   * back without an angry user.
   */
  entitlement: {
    key: 'entitlement',
    defaultValue: 'free',
    decode: oneOf(ENTITLEMENT_IDS),
    encode: identity,
  } satisfies SettingDefinition<(typeof ENTITLEMENT_IDS)[number]>,

  /** When the entitlement was last verified, UTC ISO-8601, `''` = never. */
  entitlementCheckedAt: {
    key: 'entitlement-checked-at',
    defaultValue: '',
    decode: decodeTimestamp,
    encode: identity,
  } satisfies SettingDefinition<string>,
} as const;

/**
 * Every registered setting, for diagnostics and for resetting them all.
 *
 * Written out rather than derived from `Object.values`, because each entry
 * has its own value type and `describe` has to stay type-safe per entry.
 * A test asserts this list covers the registry, so the two cannot drift.
 */
export const allSettings: readonly SettingDescriptor[] = [
  describe(appSettings.locale),
  describe(appSettings.theme),
  describe(appSettings.introCompleted),
  describe(appSettings.entitlement),
  describe(appSettings.entitlementCheckedAt),
];

/**
 * Removes every registered setting, so the next read yields the defaults.
 *
 * Defined over the registry rather than over a hand-written list: a setting
 * added later is reset automatically.
 *
 * Deliberately **not** the same action as deleting the local data. That one
 * clears content and keeps preferences; this one clears preferences and
 * keeps content. Two blast radii, two actions, two confirmations.
 */
export function resetAllSettings(): boolean {
  try {
    for (const setting of allSettings) {
      window.localStorage.removeItem(preferenceKey(setting.key));
    }
    return true;
  } catch {
    return false;
  }
}

/** The raw stored value of a setting, or `null` when nothing was written. */
export function rawValue(setting: SettingDescriptor): string | null {
  return readPreference(setting.key);
}
