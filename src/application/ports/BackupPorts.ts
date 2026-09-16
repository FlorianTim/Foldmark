import type { Address } from '@/domain/address/Address';
import type { SenderProfile } from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';
import type { Folder } from '@/domain/document/Folder';
import type { Checkpoint } from '@/domain/document/History';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import type { PrintProfile } from '@/domain/print/PrintProfile';

/**
 * Backup: everything the user owns, in one file they can keep.
 *
 * This is the promise behind "local-first". Data that lives only in one
 * browser profile is data one cleared cache away from gone, so an export that
 * restores completely is not a nice-to-have — it is what makes local storage an
 * acceptable place to keep a year of correspondence.
 *
 * The format is plain JSON with base64 asset payloads: readable, diffable, and
 * restorable by hand if Foldmark ever stops running. An encrypted variant is a
 * later change, not a replacement.
 */

/** The current backup format version. */
export const BACKUP_FORMAT_VERSION = 1;

/** One asset inside a backup: its metadata plus its bytes, base64-encoded. */
export interface BackupAsset {
  readonly asset: DocumentAsset;
  /** Standard base64, no data-URL prefix. */
  readonly dataBase64: string;
}

/** Everything one Foldmark installation holds. */
export interface BackupPackage {
  readonly format: 'foldmark-backup';
  readonly version: number;
  /** ISO-8601; when the export was taken. */
  readonly exportedAt: string;
  /** The app version that wrote it, so a future importer can migrate. */
  readonly appVersion: string;
  readonly documents: readonly FoldmarkDocument[];
  readonly addresses: readonly Address[];
  /** Pre-0006 backups carried sender identities; they are read and folded into addresses. */
  readonly senderProfiles?: readonly SenderProfile[];
  readonly printProfiles: readonly PrintProfile[];
  readonly assets: readonly BackupAsset[];
  /** Document history; absent in backups written before change 0009. */
  readonly checkpoints?: readonly Checkpoint[];
  /** Workspace folders; absent in backups written before change 0024. */
  readonly folders?: readonly Folder[];
  /** Document templates; absent in backups written before change 0039. */
  readonly templates?: readonly DocumentTemplate[];
  /** UI preferences, as stored. */
  readonly settings: Readonly<Record<string, string>>;
}

/** What an import did, so the user gets a receipt rather than a spinner. */
export interface ImportReport {
  readonly documents: number;
  readonly addresses: number;
  /** Legacy sender identities folded into the address book. */
  readonly senderProfiles: number;
  readonly printProfiles: number;
  readonly assets: number;
  readonly checkpoints: number;
  readonly folders: number;
  readonly templates: number;
  readonly settings: number;
  /** Records that were rejected, with the reason. */
  readonly issues: readonly ValidationIssue[];
}

/** How an import treats records that already exist. */
export type ImportMode = 'merge' | 'replace';
