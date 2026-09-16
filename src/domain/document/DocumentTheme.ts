/**
 * The document theme — how the *paper* looks, as opposed to how the app looks.
 *
 * Foldmark keeps the two apart on purpose (roadmap R11-019): the app theme is a
 * viewing preference that lives in this browser, the document theme travels
 * with the file and decides what the printer receives. Everything here is
 * therefore plain data on the document (`printOptions.theme`), written to the
 * front matter as the deviations from the defaults, and read by the render
 * plan, the preview, the print copy and the email renderer alike.
 *
 * ## Colours
 *
 * Text colours are **named**, never free values. A name resolves through the
 * palette below into one value for the screen and one for print, and the
 * print values are chosen for a contrast of at least 4.5:1 on white — a
 * "light yellow" that reads on a screen would vanish on paper, so on paper it
 * is a darker yellow. The names follow the ones developers already know: the
 * Tailwind tone names (`red` … `rose`, plus `gray` and `brown`), with `light-`
 * and `dark-` as the only modifiers, and a handful of semantic aliases
 * (`success`, `warning`, `danger`, `info`, `muted`, `highlight`) that a theme
 * can point at a different tone. ADR 0019 records why there is no `{rgb=…}`.
 */

import type { Millimetres } from '@/domain/common/Units';

/** The base tones of the palette, in the order the colour picker lists them. */
export const COLOR_TONES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'gray',
  'brown',
] as const;

/** One base tone. */
export type ColorTone = (typeof COLOR_TONES)[number];

/** The modifiers a tone accepts as a prefix. */
export const COLOR_MODIFIERS = ['light', 'dark'] as const;

/** `light` or `dark`. */
export type ColorModifier = (typeof COLOR_MODIFIERS)[number];

/** The semantic names a theme maps onto tones. */
export const COLOR_ALIASES = [
  'success',
  'warning',
  'danger',
  'info',
  'muted',
  'highlight',
] as const;

/** One semantic alias. */
export type ColorAlias = (typeof COLOR_ALIASES)[number];

/** A tone with an optional shade: `red`, `light-green`, `dark-blue`. */
export type ShadedColorName = ColorTone | `${ColorModifier}-${ColorTone}`;

/** A colour name as it appears in a document: a shaded tone or an alias such as `danger`. */
export type ColorName = ShadedColorName | ColorAlias;

/** One colour as the screen and the printer see it. */
export interface ColorPair {
  /** CSS colour for the on-screen preview. */
  readonly screen: string;
  /** CSS colour for paper; at least 4.5:1 against white. */
  readonly print: string;
}

/** The three shades every tone has. */
export type ToneShades = Readonly<Record<'light' | 'base' | 'dark', ColorPair>>;

/** The font stacks a document may choose from. Local system fonts only — no download, no request. */
export const FONT_FAMILIES = ['serif', 'sans', 'mono'] as const;

/** One of the three local font stacks. */
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** The CSS font stack behind each family name. */
export const FONT_STACKS: Readonly<Record<FontFamily, string>> = Object.freeze({
  serif: "Georgia, 'Times New Roman', Times, serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'Cascadia Mono', Consolas, 'Liberation Mono', Menlo, monospace",
});

/** The resolved theme every renderer works with. */
export interface DocumentTheme {
  readonly fontFamily: FontFamily;
  /** Body size in points, the unit typographers state sizes in. */
  readonly fontSizePt: number;
  /** Leading as a factor of the font size. */
  readonly lineHeight: number;
  /** Space between paragraphs, in lines. */
  readonly paragraphSpacing: number;
  /** The size of `:small[…]` and `:::small` in points. */
  readonly smallSizePt: number;
  /** Every tone with its three shades. */
  readonly colors: Readonly<Record<ColorTone, ToneShades>>;
  /** Where each semantic alias points. */
  readonly aliases: Readonly<Record<ColorAlias, ColorName>>;
  /** Background of `:highlight[…]`. */
  readonly highlight: ColorPair;
}

/** The theme as it is stored and written: only what deviates from the default. */
export interface DocumentThemeSettings {
  readonly fontFamily?: FontFamily;
  readonly fontSizePt?: number;
  readonly lineHeight?: number;
  readonly paragraphSpacing?: number;
  readonly smallSizePt?: number;
  /** Overrides per shaded tone, e.g. `{ 'light-red': { print: '#b91c1c' } }`. */
  readonly colors?: Readonly<Partial<Record<ShadedColorName, Partial<ColorPair>>>>;
  readonly aliases?: Readonly<Partial<Record<ColorAlias, ColorName>>>;
  readonly highlight?: Partial<ColorPair>;
}

/** Bounds a theme value may take, so a file cannot ask for a 400 pt letter. */
export const THEME_BOUNDS = Object.freeze({
  fontSizePt: { min: 6, max: 24 },
  lineHeight: { min: 1, max: 2.5 },
  paragraphSpacing: { min: 0, max: 3 },
  smallSizePt: { min: 5, max: 20 },
});

/**
 * Reference shades per tone, from the Tailwind palette (steps 400/600/800 on
 * screen) and, for brown, Material Design. The print shades are derived below
 * by contrast, not copied, so the rule is visible: the lightest step that still
 * reaches 4.5:1 on white becomes the light print shade, and the base and dark
 * print shades are the next steps down from it.
 */
const TONE_STEPS: Readonly<Record<ColorTone, readonly string[]>> = Object.freeze({
  //      300        400        500        600        700        800        900        950
  red: ['#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
  orange: ['#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  amber: ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
  yellow: ['#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'],
  lime: ['#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'],
  green: ['#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  emerald: ['#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
  teal: ['#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
  cyan: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
  sky: ['#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  blue: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  indigo: ['#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
  violet: ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
  purple: ['#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
  fuchsia: ['#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
  pink: ['#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
  rose: ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
  gray: ['#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
  brown: ['#a1887f', '#8d6e63', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#3e2723', '#2b1a15'],
});

const STEP_400 = 1;
const STEP_600 = 3;
const STEP_800 = 5;

/** WCAG 2 minimum contrast for normal text. */
export const MIN_PRINT_CONTRAST = 4.5;

/** Relative luminance of a `#rrggbb` colour, per WCAG 2. */
function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Contrast ratio of a `#rrggbb` colour against white. */
export function contrastOnWhite(hex: string): number {
  if (!/^#[0-9a-f]{6}$/iu.test(hex)) return 0;
  return 1.05 / (luminance(hex) + 0.05);
}

function shadesFor(steps: readonly string[]): ToneShades {
  const lightPrint = Math.max(
    0,
    steps.findIndex((step) => contrastOnWhite(step) >= MIN_PRINT_CONTRAST),
  );
  const basePrint = Math.max(lightPrint + 1, STEP_600);
  const darkPrint = Math.min(Math.max(basePrint + 1, STEP_800), steps.length - 1);
  return Object.freeze({
    light: Object.freeze({ screen: steps[STEP_400], print: steps[lightPrint] }),
    base: Object.freeze({ screen: steps[STEP_600], print: steps[basePrint] }),
    dark: Object.freeze({ screen: steps[STEP_800], print: steps[darkPrint] }),
  });
}

/** The default palette, derived once. */
export const DEFAULT_COLORS: Readonly<Record<ColorTone, ToneShades>> = Object.freeze(
  Object.fromEntries(COLOR_TONES.map((tone) => [tone, shadesFor(TONE_STEPS[tone])])) as Record<
    ColorTone,
    ToneShades
  >,
);

/** Where the semantic aliases point unless a theme says otherwise. */
export const DEFAULT_ALIASES: Readonly<Record<ColorAlias, ColorName>> = Object.freeze({
  success: 'green',
  warning: 'amber',
  danger: 'red',
  info: 'blue',
  muted: 'gray',
  highlight: 'yellow',
});

/** The theme a document has unless it says otherwise: today's rendering, unchanged. */
export const DEFAULT_DOCUMENT_THEME: DocumentTheme = Object.freeze({
  fontFamily: 'sans',
  fontSizePt: 11,
  lineHeight: 1.45,
  paragraphSpacing: 0.6,
  smallSizePt: 9,
  colors: DEFAULT_COLORS,
  aliases: DEFAULT_ALIASES,
  highlight: Object.freeze({ screen: '#fef08a', print: '#fef08a' }),
});

function clamp(value: number | undefined, bounds: { min: number; max: number }, fallback: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

/** Only `#rrggbb` is accepted from a file; anything else keeps the default. */
function hexOr(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{6}$/iu.test(value) ? value.toLowerCase() : fallback;
}

/** The full theme for a document's stored settings, defaults filled in and values bounded. */
export function resolveTheme(settings: DocumentThemeSettings | undefined): DocumentTheme {
  const base = DEFAULT_DOCUMENT_THEME;
  if (!settings) return base;

  const colors = Object.fromEntries(
    COLOR_TONES.map((tone) => {
      const shades = base.colors[tone];
      const merged = Object.fromEntries(
        (['light', 'base', 'dark'] as const).map((shade) => {
          const overrides = settings.colors?.[shadedName(tone, shade)];
          return [
            shade,
            overrides
              ? {
                  screen: hexOr(overrides.screen, shades[shade].screen),
                  print: hexOr(overrides.print, shades[shade].print),
                }
              : shades[shade],
          ];
        }),
      ) as ToneShades;
      return [tone, merged];
    }),
  ) as Record<ColorTone, ToneShades>;

  const aliases = Object.fromEntries(
    COLOR_ALIASES.map((alias) => {
      const target = settings.aliases?.[alias];
      // An alias may point at a tone or a shaded tone, never at another alias.
      return [
        alias,
        target && parseColorName(target) && !isColorAlias(target) ? target : base.aliases[alias],
      ];
    }),
  ) as Record<ColorAlias, ColorName>;

  return {
    fontFamily: FONT_FAMILIES.includes(settings.fontFamily as FontFamily)
      ? (settings.fontFamily as FontFamily)
      : base.fontFamily,
    fontSizePt: clamp(settings.fontSizePt, THEME_BOUNDS.fontSizePt, base.fontSizePt),
    lineHeight: clamp(settings.lineHeight, THEME_BOUNDS.lineHeight, base.lineHeight),
    paragraphSpacing: clamp(
      settings.paragraphSpacing,
      THEME_BOUNDS.paragraphSpacing,
      base.paragraphSpacing,
    ),
    smallSizePt: clamp(settings.smallSizePt, THEME_BOUNDS.smallSizePt, base.smallSizePt),
    colors,
    aliases,
    highlight: {
      screen: hexOr(settings.highlight?.screen, base.highlight.screen),
      print: hexOr(settings.highlight?.print, base.highlight.print),
    },
  };
}

/** The name of a tone at a shade, as written in a document: `red`, `light-red`, `dark-red`. */
export function shadedName(tone: ColorTone, shade: 'light' | 'base' | 'dark'): ShadedColorName {
  return shade === 'base' ? tone : `${shade}-${tone}`;
}

/** Whether a name is one of the semantic aliases. */
export function isColorAlias(name: string): name is ColorAlias {
  return (COLOR_ALIASES as readonly string[]).includes(name);
}

/** A colour name taken apart: its tone and shade. `null` for anything outside the palette. */
export function parseColorName(
  name: string,
): { readonly tone: ColorTone; readonly shade: 'light' | 'base' | 'dark' } | null {
  const match = /^(?:(light|dark)-)?([a-z]+)$/u.exec(name);
  if (!match) return null;
  const tone = match[2];
  if (!(COLOR_TONES as readonly string[]).includes(tone)) return null;
  return { tone: tone as ColorTone, shade: (match[1] as 'light' | 'dark' | undefined) ?? 'base' };
}

/** Whether a name is a colour the palette knows — a tone, a shaded tone or an alias. */
export function isColorName(name: string): name is ColorName {
  return isColorAlias(name) || parseColorName(name) !== null;
}

/**
 * Resolves a colour name through the theme to its screen and print values.
 * `null` for an unknown name, which every renderer shows as plain text.
 */
export function resolveColor(name: string, theme: DocumentTheme): ColorPair | null {
  const target = isColorAlias(name) ? theme.aliases[name] : name;
  const parsed = parseColorName(target);
  if (!parsed) return null;
  return theme.colors[parsed.tone][parsed.shade];
}

/** Every colour name the palette offers, tones first, then shaded tones, then aliases. */
export function allColorNames(): readonly ColorName[] {
  return [
    ...COLOR_TONES,
    ...COLOR_TONES.flatMap((tone) =>
      COLOR_MODIFIERS.map((modifier) => `${modifier}-${tone}` as const),
    ),
    ...COLOR_ALIASES,
  ];
}

/** Points to millimetres, for expressing type sizes the way typographers state them. */
export function ptToMm(value: number): Millimetres {
  return (value * 25.4) / 72;
}

/** The theme settings a document carries, with every key that equals the default removed. */
export function themeDeviations(
  settings: DocumentThemeSettings | undefined,
): DocumentThemeSettings {
  if (!settings) return {};
  const resolved = resolveTheme(settings);
  const base = DEFAULT_DOCUMENT_THEME;
  const result: Record<string, unknown> = {};
  if (resolved.fontFamily !== base.fontFamily) result.fontFamily = resolved.fontFamily;
  if (resolved.fontSizePt !== base.fontSizePt) result.fontSizePt = resolved.fontSizePt;
  if (resolved.lineHeight !== base.lineHeight) result.lineHeight = resolved.lineHeight;
  if (resolved.paragraphSpacing !== base.paragraphSpacing) {
    result.paragraphSpacing = resolved.paragraphSpacing;
  }
  if (resolved.smallSizePt !== base.smallSizePt) result.smallSizePt = resolved.smallSizePt;

  const colors: Record<string, Partial<ColorPair>> = {};
  for (const tone of COLOR_TONES) {
    for (const shade of ['light', 'base', 'dark'] as const) {
      const pair = resolved.colors[tone][shade];
      const original = base.colors[tone][shade];
      const diff: { screen?: string; print?: string } = {};
      if (pair.screen !== original.screen) diff.screen = pair.screen;
      if (pair.print !== original.print) diff.print = pair.print;
      if (Object.keys(diff).length) colors[shadedName(tone, shade)] = diff;
    }
  }
  if (Object.keys(colors).length) result.colors = colors;

  const aliases: Record<string, ColorName> = {};
  for (const alias of COLOR_ALIASES) {
    if (resolved.aliases[alias] !== base.aliases[alias]) aliases[alias] = resolved.aliases[alias];
  }
  if (Object.keys(aliases).length) result.aliases = aliases;

  const highlight: { screen?: string; print?: string } = {};
  if (resolved.highlight.screen !== base.highlight.screen)
    highlight.screen = resolved.highlight.screen;
  if (resolved.highlight.print !== base.highlight.print) highlight.print = resolved.highlight.print;
  if (Object.keys(highlight).length) result.highlight = highlight;

  return result as DocumentThemeSettings;
}
