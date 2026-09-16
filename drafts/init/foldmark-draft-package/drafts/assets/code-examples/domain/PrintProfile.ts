export type MarkerKind =
  | 'fold'
  | 'hole'
  | 'cut'
  | 'safe-area'
  | 'bleed'
  | 'separator'
  | 'address-window'
  | 'stamp-area'
  | 'grid'
  | 'custom';

export interface PrintMarker {
  readonly id: string;
  kind: MarkerKind;
  label?: string;
  xMm: number;
  yMm: number;
  widthMm?: number;
  heightMm?: number;
  orientation?: 'horizontal' | 'vertical';
  strokeWidthMm?: number;
  preview: boolean;
  print: boolean;
  surface?: 'all' | 'front' | 'back';
}

export interface PrintProfile {
  readonly id: string;
  readonly version: number;
  name: Record<string, string>;
  category: 'letter' | 'postcard' | 'card' | 'photo' | 'label' | 'custom';
  builtIn: boolean;
  page: { widthMm: number; heightMm: number; orientation: 'portrait' | 'landscape' };
  margins: { topMm: number; rightMm: number; bottomMm: number; leftMm: number };
  markers: readonly PrintMarker[];
  regions?: Record<string, BoxMm>;
  duplex?: { flip: 'long-edge' | 'short-edge'; surfaces: readonly ['front', 'back'] };
}

export interface BoxMm { xMm: number; yMm: number; widthMm: number; heightMm: number }
