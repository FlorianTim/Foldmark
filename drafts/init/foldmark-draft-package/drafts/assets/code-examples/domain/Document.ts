export type DocumentKind =
  | 'letter'
  | 'postcard'
  | 'card'
  | 'photo-card'
  | 'email'
  | 'custom';

export interface FoldmarkDocument {
  readonly id: string;
  readonly schemaVersion: 1;
  kind: DocumentKind;
  title: string;
  locale: string;
  bodyMarkdown: string;
  metadata: Record<string, unknown>;
  preferredPrintProfileId?: string;
  assetPlacements: readonly PositionedAsset[];
  signatureId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionedAsset {
  readonly id: string;
  readonly assetId: string;
  surface: 'all' | 'front' | 'back' | number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm?: number;
  rotationDeg: number;
  opacity: number;
  layer: 'background' | 'content' | 'foreground';
  fit: 'contain' | 'cover' | 'stretch';
}
