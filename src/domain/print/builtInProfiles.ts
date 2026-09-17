import {
  DEFAULT_STROKE_WIDTH_MM,
  type MarkerKind,
  type MarkerLineStyle,
  type PrintMarker,
  type SurfaceScope,
} from '@/domain/print/PrintMarker';
import type { PrintProfile, ProfileRegion } from '@/domain/print/PrintProfile';

/**
 * The print profiles Foldmark ships.
 *
 * These are **data, not configuration**: they are frozen, they are versioned,
 * and the application never writes to them. Editing one in the UI clones it
 * first, so the geometry the app was shipped with stays reproducible — a letter
 * printed today and the same letter printed next year land on the same fold.
 *
 * ## About the DIN-style profiles
 *
 * `din5008-a` and `din5008-b` are built from the commonly cited working values
 * for the two German business-letter forms. They have **not** been checked
 * against a licensed copy of the current standard, so they carry
 * `standardsStatus: 'draft-unverified'`, they are named "DIN-style", and the UI
 * says so. Foldmark does not claim conformance it has not verified — and a user
 * who needs conformance needs to know that before the envelope is sealed, not
 * after.
 *
 * The values used here: Form B folds at 105 mm and 210 mm, Form A at 87 mm and
 * 192 mm, both punched at 148.5 mm — the middle of an A4 sheet, which is the one
 * value that is geometry rather than convention.
 */

function marker(
  id: string,
  kind: MarkerKind,
  geometry: {
    xMm: number;
    yMm: number;
    widthMm?: number;
    heightMm?: number;
    orientation?: 'horizontal' | 'vertical';
    strokeWidthMm?: number;
    lineStyle?: MarkerLineStyle;
    preview?: boolean;
    print?: boolean;
    surface?: SurfaceScope;
    label?: string;
  },
): PrintMarker {
  return {
    id,
    kind,
    label: geometry.label,
    xMm: geometry.xMm,
    yMm: geometry.yMm,
    widthMm: geometry.widthMm,
    heightMm: geometry.heightMm,
    orientation: geometry.orientation ?? 'horizontal',
    strokeWidthMm: geometry.strokeWidthMm ?? DEFAULT_STROKE_WIDTH_MM,
    lineStyle: geometry.lineStyle ?? 'solid',
    preview: geometry.preview ?? true,
    print: geometry.print ?? false,
    surface: geometry.surface ?? 'all',
    locked: true,
  };
}

function area(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  surface: SurfaceScope = 'all',
): ProfileRegion {
  return { xMm, yMm, widthMm, heightMm, surface };
}

const A4 = { widthMm: 210, heightMm: 297, orientation: 'portrait' } as const;

/** A4 letter in the DIN-style Form B geometry, with printed fold and punch marks. */
const din5008B: PrintProfile = {
  id: 'din5008-b',
  version: 1,
  name: { de: 'DIN A4 Brief – Form B', en: 'DIN A4 letter – Form B' },
  category: 'letter',
  builtIn: true,
  page: A4,
  margins: { topMm: 45, rightMm: 20, bottomMm: 20, leftMm: 25 },
  capabilities: { foldMarks: true, addressWindow: true, duplex: false, bleed: false },
  markers: [
    marker('fold-top', 'fold', { xMm: 5, yMm: 105, widthMm: 8, print: true, label: 'Falz 1' }),
    marker('punch', 'hole', { xMm: 5, yMm: 148.5, widthMm: 12, print: true, label: 'Lochmarke' }),
    marker('fold-bottom', 'fold', { xMm: 5, yMm: 210, widthMm: 8, print: true, label: 'Falz 2' }),
  ],
  regions: {
    letterhead: area(25, 5, 160, 35),
    addressWindow: area(20, 45, 85, 45),
    infoBlock: area(125, 45, 65, 40),
    subject: area(25, 98.5, 165, 6),
    body: area(25, 105, 165, 167),
    footer: area(25, 275, 165, 15),
  },
  standardsStatus: 'draft-unverified',
};

/** A4 letter in the DIN-style Form A geometry, with a higher address field. */
const din5008A: PrintProfile = {
  id: 'din5008-a',
  version: 1,
  name: { de: 'DIN A4 Brief – Form A', en: 'DIN A4 letter – Form A' },
  category: 'letter',
  builtIn: true,
  page: A4,
  margins: { topMm: 27, rightMm: 20, bottomMm: 20, leftMm: 25 },
  capabilities: { foldMarks: true, addressWindow: true, duplex: false, bleed: false },
  markers: [
    marker('fold-top', 'fold', { xMm: 5, yMm: 87, widthMm: 8, print: true, label: 'Falz 1' }),
    marker('punch', 'hole', { xMm: 5, yMm: 148.5, widthMm: 12, print: true, label: 'Lochmarke' }),
    marker('fold-bottom', 'fold', { xMm: 5, yMm: 192, widthMm: 8, print: true, label: 'Falz 2' }),
  ],
  regions: {
    letterhead: area(25, 5, 160, 17),
    addressWindow: area(20, 27, 85, 40),
    infoBlock: area(125, 27, 65, 40),
    subject: area(25, 80, 165, 6),
    body: area(25, 87, 165, 170),
    footer: area(25, 262, 165, 15),
  },
  standardsStatus: 'draft-unverified',
};

/** Plain A4 with no helper marks — the profile for correspondence that is not folded. */
const a4Blank: PrintProfile = {
  id: 'a4-blank',
  version: 1,
  name: { de: 'A4 frei', en: 'A4 blank' },
  category: 'letter',
  builtIn: true,
  page: A4,
  margins: { topMm: 20, rightMm: 20, bottomMm: 20, leftMm: 20 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(20, 20, 170, 257) },
  standardsStatus: 'not-applicable',
};

/** A4 with a reserved letterhead band, for a locally stored logo or background. */
const a4Letterhead: PrintProfile = {
  id: 'a4-letterhead',
  version: 1,
  name: { de: 'A4 mit Briefkopf', en: 'A4 with letterhead' },
  category: 'letter',
  builtIn: true,
  page: A4,
  margins: { topMm: 45, rightMm: 20, bottomMm: 25, leftMm: 25 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [
    marker('letterhead-guide', 'safe-area', {
      xMm: 20,
      yMm: 10,
      widthMm: 170,
      heightMm: 30,
      lineStyle: 'dashed',
      label: 'Briefkopf',
    }),
  ],
  regions: {
    letterhead: area(20, 10, 170, 30),
    body: area(25, 50, 165, 222),
    footer: area(25, 275, 165, 12),
  },
  standardsStatus: 'not-applicable',
};

/** A5 portrait card with a preview-only safe area. */
const a5Card: PrintProfile = {
  id: 'a5-card',
  version: 1,
  name: { de: 'A5 Karte', en: 'A5 card' },
  category: 'card',
  builtIn: true,
  page: { widthMm: 148, heightMm: 210, orientation: 'portrait' },
  margins: { topMm: 10, rightMm: 10, bottomMm: 10, leftMm: 10 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [
    marker('safe', 'safe-area', {
      xMm: 5,
      yMm: 5,
      widthMm: 138,
      heightMm: 200,
      lineStyle: 'dashed',
      label: 'Sicherheitsbereich',
    }),
  ],
  regions: { body: area(10, 10, 128, 190) },
  standardsStatus: 'not-applicable',
};

/**
 * A6 landscape postcard with a front and a back.
 *
 * The flip is `short-edge`: a landscape card turned over the long edge comes out
 * upside down, which is the single most common way a duplex postcard is ruined.
 */
const postcardA6: PrintProfile = {
  id: 'postcard-a6-landscape-duplex',
  version: 1,
  name: {
    de: 'Postkarte A6 quer, Vorder-/Rückseite',
    en: 'A6 landscape postcard, duplex',
  },
  category: 'postcard',
  builtIn: true,
  page: { widthMm: 148, heightMm: 105, orientation: 'landscape' },
  margins: { topMm: 6, rightMm: 6, bottomMm: 6, leftMm: 6 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: true, bleed: false },
  duplex: { flip: 'short-edge', surfaces: ['front', 'back'] },
  markers: [
    marker('safe', 'safe-area', {
      xMm: 4,
      yMm: 4,
      widthMm: 140,
      heightMm: 97,
      lineStyle: 'dashed',
      label: 'Sicherheitsbereich',
    }),
    marker('divider', 'separator', {
      xMm: 74,
      yMm: 8,
      heightMm: 89,
      orientation: 'vertical',
      print: true,
      surface: 'back',
      label: 'Trennlinie',
    }),
    marker('stamp-guide', 'stamp-area', {
      xMm: 118,
      yMm: 8,
      widthMm: 22,
      heightMm: 28,
      lineStyle: 'dashed',
      surface: 'back',
      label: 'Briefmarke',
    }),
  ],
  regions: {
    background: area(0, 0, 148, 105, 'front'),
    caption: area(8, 80, 132, 17, 'front'),
    message: area(8, 10, 62, 85, 'back'),
    address: area(80, 40, 60, 50, 'back'),
    stamp: area(118, 8, 22, 28, 'back'),
  },
  standardsStatus: 'not-applicable',
};

/** 10 × 15 cm photo portrait, with bleed and a preview-only safe area. */
const photo10x15: PrintProfile = {
  id: 'photo-10x15',
  version: 1,
  name: { de: 'Foto 10 × 15 cm', en: 'Photo 10 × 15 cm' },
  category: 'photo',
  builtIn: true,
  page: { widthMm: 100, heightMm: 150, orientation: 'portrait' },
  margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: true },
  bleed: { topMm: 2, rightMm: 2, bottomMm: 2, leftMm: 2 },
  markers: [
    marker('bleed', 'bleed', {
      xMm: -2,
      yMm: -2,
      widthMm: 104,
      heightMm: 154,
      lineStyle: 'dotted',
      label: 'Anschnitt',
    }),
    marker('safe', 'safe-area', {
      xMm: 5,
      yMm: 5,
      widthMm: 90,
      heightMm: 140,
      lineStyle: 'dashed',
      label: 'Sicherheitsbereich',
    }),
  ],
  regions: { background: area(0, 0, 100, 150) },
  standardsStatus: 'not-applicable',
};

/** A4 turned sideways — tables, certificates, notices — with the plain margins of A4 blank. */
const a4Landscape: PrintProfile = {
  id: 'a4-landscape',
  version: 1,
  name: { de: 'A4 quer', en: 'A4 landscape' },
  category: 'letter',
  builtIn: true,
  page: { widthMm: 297, heightMm: 210, orientation: 'landscape' },
  margins: { topMm: 20, rightMm: 20, bottomMm: 20, leftMm: 20 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(20, 20, 257, 170) },
  standardsStatus: 'not-applicable',
};

/** A5 turned sideways, with the margins of the A5 letter. */
const a5Landscape: PrintProfile = {
  id: 'a5-landscape',
  version: 1,
  name: { de: 'A5 quer', en: 'A5 landscape' },
  category: 'letter',
  builtIn: true,
  page: { widthMm: 210, heightMm: 148, orientation: 'landscape' },
  margins: { topMm: 15, rightMm: 15, bottomMm: 15, leftMm: 15 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(15, 15, 180, 118) },
  standardsStatus: 'not-applicable',
};

/** US Letter turned sideways, with its one-inch margins. */
const usLetterLandscape: PrintProfile = {
  id: 'us-letter-landscape',
  version: 1,
  name: { de: 'US Letter quer', en: 'US Letter landscape' },
  category: 'letter',
  builtIn: true,
  page: { widthMm: 279.4, heightMm: 215.9, orientation: 'landscape' },
  margins: { topMm: 25.4, rightMm: 25.4, bottomMm: 25.4, leftMm: 25.4 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(25.4, 25.4, 228.6, 165.1) },
  standardsStatus: 'not-applicable',
};

/** A5 portrait letter for short notes, with the same plain margins as A4 blank. */
const a5Letter: PrintProfile = {
  id: 'a5-letter',
  version: 1,
  name: { de: 'A5 Brief', en: 'A5 letter' },
  category: 'letter',
  builtIn: true,
  page: { widthMm: 148, heightMm: 210, orientation: 'portrait' },
  margins: { topMm: 15, rightMm: 15, bottomMm: 15, leftMm: 15 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(15, 15, 118, 180) },
  standardsStatus: 'not-applicable',
};

/** A6 portrait card — the greeting-card size that fits a C6 envelope. */
const a6Card: PrintProfile = {
  id: 'a6-card',
  version: 1,
  name: { de: 'A6 Karte', en: 'A6 card' },
  category: 'card',
  builtIn: true,
  page: { widthMm: 105, heightMm: 148, orientation: 'portrait' },
  margins: { topMm: 8, rightMm: 8, bottomMm: 8, leftMm: 8 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [
    marker('safe', 'safe-area', {
      xMm: 4,
      yMm: 4,
      widthMm: 97,
      heightMm: 140,
      lineStyle: 'dashed',
      label: 'Sicherheitsbereich',
    }),
  ],
  regions: { body: area(8, 8, 89, 132) },
  standardsStatus: 'not-applicable',
};

/** A photo profile of the given size, with bleed and a preview-only safe area. */
function photoProfile(id: string, widthMm: number, heightMm: number): PrintProfile {
  const label = `${widthMm / 10} × ${heightMm / 10} cm`;
  return {
    id,
    version: 1,
    name: { de: `Foto ${label}`, en: `Photo ${label}` },
    category: 'photo',
    builtIn: true,
    page: { widthMm, heightMm, orientation: 'portrait' },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: true },
    bleed: { topMm: 2, rightMm: 2, bottomMm: 2, leftMm: 2 },
    markers: [
      marker('bleed', 'bleed', {
        xMm: -2,
        yMm: -2,
        widthMm: widthMm + 4,
        heightMm: heightMm + 4,
        lineStyle: 'dotted',
        label: 'Anschnitt',
      }),
      marker('safe', 'safe-area', {
        xMm: 5,
        yMm: 5,
        widthMm: widthMm - 10,
        heightMm: heightMm - 10,
        lineStyle: 'dashed',
        label: 'Sicherheitsbereich',
      }),
    ],
    regions: { background: area(0, 0, widthMm, heightMm) },
    standardsStatus: 'not-applicable',
  };
}

const photo13x18 = photoProfile('photo-13x18', 130, 180);
const photo15x20 = photoProfile('photo-15x20', 150, 200);

/** DL envelope, landscape, printed directly: the address block on the right half. */
const envelopeDl: PrintProfile = {
  id: 'envelope-dl',
  version: 1,
  name: { de: 'Briefumschlag DL', en: 'DL envelope' },
  category: 'custom',
  builtIn: true,
  page: { widthMm: 220, heightMm: 110, orientation: 'landscape' },
  margins: { topMm: 10, rightMm: 15, bottomMm: 15, leftMm: 15 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [
    marker('stamp-guide', 'stamp-area', {
      xMm: 180,
      yMm: 8,
      widthMm: 30,
      heightMm: 30,
      lineStyle: 'dashed',
      label: 'Briefmarke',
    }),
    marker('address-guide', 'safe-area', {
      xMm: 110,
      yMm: 50,
      widthMm: 95,
      heightMm: 45,
      lineStyle: 'dashed',
      label: 'Anschrift',
    }),
  ],
  regions: {
    letterhead: area(15, 10, 80, 30),
    body: area(110, 50, 95, 45),
  },
  standardsStatus: 'not-applicable',
};

/** A7 landscape index card for notes and flash cards. */
const a7IndexCard: PrintProfile = {
  id: 'a7-index-card',
  version: 1,
  name: { de: 'Lernkarte A7', en: 'A7 index card' },
  category: 'custom',
  builtIn: true,
  page: { widthMm: 105, heightMm: 74, orientation: 'landscape' },
  margins: { topMm: 6, rightMm: 6, bottomMm: 6, leftMm: 6 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(6, 6, 93, 62) },
  standardsStatus: 'not-applicable',
};

/** US Letter portrait, with no DIN-specific assumptions. */
const usLetter: PrintProfile = {
  id: 'us-letter',
  version: 1,
  name: { de: 'US Letter', en: 'US Letter' },
  category: 'letter',
  builtIn: true,
  page: { widthMm: 215.9, heightMm: 279.4, orientation: 'portrait' },
  margins: { topMm: 25.4, rightMm: 25.4, bottomMm: 25.4, leftMm: 25.4 },
  capabilities: { foldMarks: false, addressWindow: false, duplex: false, bleed: false },
  markers: [],
  regions: { body: area(25.4, 25.4, 165.1, 228.6) },
  standardsStatus: 'not-applicable',
};

/**
 * Every shipped profile, in the order the picker offers them.
 *
 * Deep-frozen rather than merely `readonly`: `readonly` is a compile-time
 * promise, and these objects are handed to a Vue reactivity system and to code
 * that parses untrusted files. `Object.freeze` is what makes "built-in profiles
 * are immutable" true at runtime as well.
 */
export const BUILT_IN_PROFILES: readonly PrintProfile[] = Object.freeze(
  [
    din5008B,
    din5008A,
    a4Blank,
    a4Letterhead,
    a5Letter,
    usLetter,
    a4Landscape,
    a5Landscape,
    usLetterLandscape,
    postcardA6,
    a5Card,
    a6Card,
    photo10x15,
    photo13x18,
    photo15x20,
    envelopeDl,
    a7IndexCard,
  ].map(deepFreeze),
);

/** The catalogue's groups in display order (R13-031): letters, cards, photos, the rest. */
export const PROFILE_GROUPS: readonly {
  readonly id: 'letters' | 'cards' | 'photos' | 'other';
  readonly categories: readonly PrintProfile['category'][];
}[] = Object.freeze([
  { id: 'letters', categories: ['letter'] },
  { id: 'cards', categories: ['postcard', 'card'] },
  { id: 'photos', categories: ['photo'] },
  { id: 'other', categories: ['label', 'custom'] },
]);

/** Profiles sorted into the display groups; empty groups are left out. */
export function groupProfiles(profiles: readonly PrintProfile[]): readonly {
  readonly id: (typeof PROFILE_GROUPS)[number]['id'];
  readonly profiles: readonly PrintProfile[];
}[] {
  return PROFILE_GROUPS.map((group) => ({
    id: group.id,
    profiles: profiles.filter((profile) => group.categories.includes(profile.category)),
  })).filter((group) => group.profiles.length > 0);
}

/** The profile a new document starts with when nothing else is configured. */
export const DEFAULT_PROFILE_ID = 'din5008-b';

/** Looks up a shipped profile by id. */
export function findBuiltInProfile(id: string): PrintProfile | undefined {
  return BUILT_IN_PROFILES.find((profile) => profile.id === id);
}

/** The shipped profiles that can render the given document kind. */
export function builtInProfilesForCategory(
  category: PrintProfile['category'],
): readonly PrintProfile[] {
  return BUILT_IN_PROFILES.filter((profile) => profile.category === category);
}

function deepFreeze(profile: PrintProfile): PrintProfile {
  Object.freeze(profile.page);
  Object.freeze(profile.margins);
  Object.freeze(profile.capabilities);
  for (const value of Object.values(profile.regions)) Object.freeze(value);
  Object.freeze(profile.regions);
  for (const value of profile.markers) Object.freeze(value);
  Object.freeze(profile.markers);
  if (profile.duplex) Object.freeze(profile.duplex);
  if (profile.bleed) Object.freeze(profile.bleed);
  return Object.freeze(profile);
}
