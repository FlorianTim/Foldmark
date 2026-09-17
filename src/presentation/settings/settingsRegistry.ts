import { appConfig } from '@/config';
import { isValidId } from '@/domain/common/Ids';
import { DEFAULT_PROFILE_ID } from '@/domain/print/builtInProfiles';
import {
  decodeDocumentDefaults,
  encodeDocumentDefaults,
  FACTORY_DOCUMENT_DEFAULTS,
  type DocumentDefaults,
} from '@/presentation/settings/documentDefaults';
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

/** How the paper preview is scaled on screen. Never affects exported geometry. */
export const PREVIEW_ZOOM_IDS = ['fit-page', 'fit-width', 'actual'] as const;

/** The three workspace modes: what the document is, what it says, what the paper shows. */
export const WORKSPACE_MODE_IDS = ['document', 'write', 'preview'] as const;

/** A workspace mode identifier. */
export type WorkspaceMode = (typeof WORKSPACE_MODE_IDS)[number];

/** The two views of the body: rich text, or the Markdown source itself. */
export const EDITOR_VIEW_IDS = ['visual', 'source'] as const;

/** An editor view identifier. */
export type EditorView = (typeof EDITOR_VIEW_IDS)[number];

/**
 * Pane layout on wide screens, in words (R13-013): `auto` derives it from the
 * width; the others name the areas to show. The 1.1 values `tabs`, `two` and
 * `three` are read as `write`, `auto` and `all` so a stored preference survives.
 */
export const WORKSPACE_LAYOUT_IDS = [
  'auto',
  'document',
  'write',
  'preview',
  'document-write',
  'write-preview',
  'document-preview',
  'all',
] as const;

/** The 1.1 spellings of the layout preference, mapped onto the named layouts. */
const LEGACY_LAYOUTS: Readonly<Record<string, (typeof WORKSPACE_LAYOUT_IDS)[number]>> = {
  tabs: 'write',
  two: 'auto',
  three: 'all',
};

/** A workspace layout identifier. */
export type WorkspaceLayout = (typeof WORKSPACE_LAYOUT_IDS)[number];

/** Display scale of the paper preview. */
export type PreviewZoom = (typeof PREVIEW_ZOOM_IDS)[number];

/** The accordion groups of the document settings, in display order (R13-017). */
export const DOCUMENT_SECTION_IDS = ['document', 'sender', 'recipient', 'letter'] as const;

/** One group of the document settings. */
export type DocumentSectionId = (typeof DOCUMENT_SECTION_IDS)[number];

/** How many automatic checkpoints a document keeps (R13-023); 50 is the 1.0 bound. */
export const HISTORY_RETENTION_OPTIONS = [10, 20, 50, 100] as const;

/**
 * A stored identifier, or `null` when it is not one Foldmark would have written.
 *
 * `''` is accepted and means "nothing chosen" — the difference between an empty
 * default and a corrupted value matters here, because the first is a normal
 * state and the second must fall back.
 */
const decodeId = (raw: string): string | null =>
  raw === '' || (raw.length <= 80 && isValidId(raw)) ? raw : null;

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

  /**
   * The colour theme, defaulting to the one the application is configured with.
   *
   * Taken from `app.config.json` rather than hard-coded to `system`: the
   * configuration already names a theme, and an app that ships "paper" and then
   * opens in dark mode has two answers to the same question.
   */
  theme: {
    key: 'theme',
    defaultValue: appConfig.theme,
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

  /**
   * Successful uses of premium features with a free allowance (change 0040),
   * as `feature=count` pairs: `qr.generate=3`. A counter, not a licence —
   * it lives here with the other preferences, and "Reset settings" resets it.
   * An unreadable pair is dropped, never the whole map.
   */
  premiumUsage: {
    key: 'premium-usage',
    defaultValue: {},
    decode: (raw: string) => {
      const usage: Record<string, number> = {};
      for (const pair of raw.split(';')) {
        const [feature, count] = pair.split('=');
        const number = Number(count);
        if (
          feature &&
          /^[a-z][a-z.-]*$/u.test(feature) &&
          Number.isInteger(number) &&
          number >= 0
        ) {
          usage[feature] = number;
        }
      }
      return usage;
    },
    encode: (value: Readonly<Record<string, number>>) =>
      Object.entries(value)
        .map(([feature, count]) => `${feature}=${count}`)
        .join(';'),
  } satisfies SettingDefinition<Readonly<Record<string, number>>>,

  /**
   * The sender identity new documents start with, `''` = none chosen.
   *
   * Stored as an id and resolved when a document is opened, not copied into the
   * document: a person who corrects their street address expects the next letter
   * to be right, and the ones already written to stay as they were sent.
   */
  defaultSenderProfileId: {
    key: 'default-sender-profile',
    defaultValue: '',
    decode: decodeId,
    encode: identity,
  } satisfies SettingDefinition<string>,

  /**
   * What a new document starts with (change 0028): language, date format,
   * typography and page numbers, as one object. Read by `workspace.create`.
   */
  documentDefaults: {
    key: 'document-defaults',
    defaultValue: FACTORY_DOCUMENT_DEFAULTS,
    decode: decodeDocumentDefaults,
    encode: encodeDocumentDefaults,
  } satisfies SettingDefinition<DocumentDefaults>,

  /** The print profile new documents start with. */
  defaultPrintProfileId: {
    key: 'default-print-profile',
    defaultValue: DEFAULT_PROFILE_ID,
    decode: decodeId,
    encode: identity,
  } satisfies SettingDefinition<string>,

  /**
   * How the preview fits the paper on screen.
   *
   * Purely a display preference. It is stored next to the others rather than in
   * the document precisely because it must never be able to influence what is
   * exported — the whole point of the zoom control is that it cannot.
   */
  previewZoom: {
    key: 'preview-zoom',
    defaultValue: 'fit-page',
    decode: oneOf(PREVIEW_ZOOM_IDS),
    encode: identity,
  } satisfies SettingDefinition<PreviewZoom>,

  /**
   * Whether the offer to set up the own sender (R15-006, change 0044) was
   * declined for good. Only "don't ask again" writes it; "later" is for the
   * session. Setting up a primary contact makes the offer moot without it.
   */
  senderOnboardingDismissed: {
    key: 'sender-onboarding-v1',
    defaultValue: false,
    decode: decodeBoolean,
    encode: encodeBoolean,
  } satisfies SettingDefinition<boolean>,

  /** Whether preview-only guides — safe areas, stamp boxes — are drawn on screen. */
  showPreviewGuides: {
    key: 'preview-guides',
    defaultValue: true,
    decode: decodeBoolean,
    encode: encodeBoolean,
  } satisfies SettingDefinition<boolean>,

  /** The workspace mode last used — Document, Write or Preview. */
  workspaceMode: {
    key: 'workspace-mode',
    defaultValue: 'document',
    decode: oneOf(WORKSPACE_MODE_IDS),
    encode: identity,
  } satisfies SettingDefinition<WorkspaceMode>,

  /**
   * How many workspace panes are shown side by side on a wide screen.
   *
   * `auto` follows the width; the explicit values let someone with a wide
   * monitor insist on tabs, or someone with a narrow one squeeze in two.
   */
  workspaceLayout: {
    key: 'workspace-layout',
    defaultValue: 'auto',
    decode: (raw: string) => LEGACY_LAYOUTS[raw] ?? oneOf(WORKSPACE_LAYOUT_IDS)(raw),
    encode: identity,
  } satisfies SettingDefinition<WorkspaceLayout>,

  /**
   * Which side panes are folded to a rail (R13-014). Stored as two words so a
   * value from a later build with more panes still reads.
   */
  workspaceCollapsed: {
    key: 'workspace-collapsed',
    defaultValue: { document: false, preview: false },
    decode: (raw: string) => {
      const parts = raw.split(',').filter(Boolean);
      if (!parts.every((part) => part === 'document' || part === 'preview')) return null;
      return { document: parts.includes('document'), preview: parts.includes('preview') };
    },
    encode: (value: { document: boolean; preview: boolean }) =>
      (['document', 'preview'] as const).filter((pane) => value[pane]).join(','),
  } satisfies SettingDefinition<{ document: boolean; preview: boolean }>,

  /**
   * The relative widths of the three panes, as fractions summing to one
   * (R13-014). Anything that does not parse to three positive numbers is the
   * default — a pane can never be stored at zero.
   */
  workspacePaneWidths: {
    key: 'workspace-pane-widths',
    defaultValue: { document: 0.26, write: 0.36, preview: 0.38 },
    decode: (raw: string) => {
      const parts = raw.split(',').map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part) || part <= 0)) {
        return null;
      }
      const sum = parts[0] + parts[1] + parts[2];
      return { document: parts[0] / sum, write: parts[1] / sum, preview: parts[2] / sum };
    },
    encode: (value: { document: number; write: number; preview: number }) =>
      [value.document, value.write, value.preview].map((part) => part.toFixed(4)).join(','),
  } satisfies SettingDefinition<{ document: number; write: number; preview: number }>,

  /**
   * Which groups of the document settings are unfolded (R13-017). Stored as
   * the open ids; unknown ids from a later build are dropped, never fatal.
   */
  documentSectionsOpen: {
    key: 'document-sections-open',
    defaultValue: ['document', 'sender', 'recipient', 'letter'] as readonly string[],
    decode: (raw: string) =>
      raw.split(',').filter((id) => DOCUMENT_SECTION_IDS.some((known) => known === id)),
    encode: (value: readonly string[]) => value.join(','),
  } satisfies SettingDefinition<readonly string[]>,

  /**
   * Automatic checkpoints kept per document before the oldest are pruned.
   * Manual, imported and restore checkpoints are never subject to it.
   */
  historyAutomaticVersions: {
    key: 'history-automatic-versions',
    defaultValue: 50,
    decode: (raw: string) => {
      const value = Number(raw);
      return HISTORY_RETENTION_OPTIONS.some((option) => option === value)
        ? (value as (typeof HISTORY_RETENTION_OPTIONS)[number])
        : null;
    },
    encode: (value: number) => String(value),
  } satisfies SettingDefinition<(typeof HISTORY_RETENTION_OPTIONS)[number]>,

  /** Whether the body is edited visually or as Markdown source. */
  editorView: {
    key: 'editor-view',
    defaultValue: 'visual',
    decode: oneOf(EDITOR_VIEW_IDS),
    encode: identity,
  } satisfies SettingDefinition<EditorView>,
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
  describe(appSettings.senderOnboardingDismissed),
  describe(appSettings.entitlement),
  describe(appSettings.entitlementCheckedAt),
  describe(appSettings.premiumUsage),
  describe(appSettings.defaultSenderProfileId),
  describe(appSettings.defaultPrintProfileId),
  describe(appSettings.documentDefaults),
  describe(appSettings.previewZoom),
  describe(appSettings.showPreviewGuides),
  describe(appSettings.workspaceMode),
  describe(appSettings.workspaceLayout),
  describe(appSettings.workspaceCollapsed),
  describe(appSettings.workspacePaneWidths),
  describe(appSettings.documentSectionsOpen),
  describe(appSettings.historyAutomaticVersions),
  describe(appSettings.editorView),
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
