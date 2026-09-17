import { InvalidInputError, LimitReachedError } from '@/application/errors/FoldmarkErrors';
import type { FeatureUsageStore } from '@/application/ports/FeatureUsageStore';
import {
  canUseFeature,
  featureState,
  type FeatureEntitlement,
} from '@/domain/entitlement/premiumFeatures';
import { IMAGE_ALIGNMENTS, QR_SIZE_MM } from '@/domain/markdown/directives';
import {
  encodeQrMatrix,
  isQrErrorCorrection,
  validateQrPayload,
  type QrCodeSpec,
} from '@/domain/qr/qrCode';

/** What the dialog hands over: the spec as typed, not yet trusted. */
export interface QrCodeRequest {
  readonly payload: string;
  readonly sizeMm?: number;
  readonly align?: string;
  readonly errorCorrection?: string;
}

/**
 * QR code use cases (R15-011, change 0040): the premium state of generating
 * one, and the generation itself.
 *
 * "Generating" a code is inserting a new one into a document; drawing an
 * existing one, editing its size or reopening the document costs nothing.
 * The gate is asked **here** (C12): the dialog shows the state, this method
 * decides. The counter moves only after a spec passed every check, so a
 * refused payload never uses up an allowance.
 */
export class QrCodeService {
  public constructor(private readonly usage: FeatureUsageStore) {}

  /** The premium state of generating one more code. */
  public state(): FeatureEntitlement {
    return featureState('qr.generate', this.usage.read('qr.generate'));
  }

  /**
   * Checks and normalises a request without counting it — what the dialog
   * runs while the writer types, and what an edit of an existing code goes
   * through.
   *
   * @throws {InvalidInputError} With the field that failed: `payload` when it
   *   is empty, too long, multi-line, carries control characters or does not
   *   fit a symbol at the requested level.
   */
  public prepare(request: QrCodeRequest): QrCodeSpec {
    const payload = request.payload.trim();
    const issue = validateQrPayload(payload);
    if (issue) throw new InvalidInputError(`payload.${issue}`);
    const errorCorrection =
      request.errorCorrection && isQrErrorCorrection(request.errorCorrection)
        ? request.errorCorrection
        : 'M';
    if (!encodeQrMatrix(payload, errorCorrection)) throw new InvalidInputError('payload.too-long');
    const size = Number.isFinite(request.sizeMm) ? Math.round(request.sizeMm ?? 0) : 0;
    const align = (IMAGE_ALIGNMENTS as readonly string[]).includes(request.align ?? '')
      ? (request.align as QrCodeSpec['align'])
      : 'left';
    return {
      payload,
      sizeMm: size ? Math.min(Math.max(size, QR_SIZE_MM.min), QR_SIZE_MM.max) : QR_SIZE_MM.fallback,
      align,
      errorCorrection,
    };
  }

  /**
   * Generates a new code: checks the request, asks the gate, counts the use.
   *
   * @throws {LimitReachedError} When the feature is locked for this installation.
   * @throws {InvalidInputError} As `prepare`.
   */
  public generate(request: QrCodeRequest): QrCodeSpec {
    const state = this.state();
    if (!canUseFeature(state)) throw new LimitReachedError('qr', state.limit ?? 0);
    const spec = this.prepare(request);
    this.usage.increment('qr.generate');
    return spec;
  }
}
