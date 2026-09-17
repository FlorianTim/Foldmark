import {
  ImmutableRecordError,
  InvalidInputError,
  NotFoundError,
} from '@/application/errors/FoldmarkErrors';
import type { PrintProfileRepository } from '@/application/ports/LibraryRepositories';
import { slugifyId } from '@/domain/common/Ids';
import type { MarginsMm, PageSizeMm } from '@/domain/common/Units';
import { hasBlockingIssue, type ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE_ID,
  findBuiltInProfile,
} from '@/domain/print/builtInProfiles';
import {
  bodyFollowsMargins,
  cloneProfile,
  turnProfile,
  type LocalizedName,
  type PrintProfile,
} from '@/domain/print/PrintProfile';
import { capabilitiesFor, MARKERS_MAX } from '@/domain/print/markerEditing';
import type { PrintMarker } from '@/domain/print/PrintMarker';
import { PrintProfileSchema } from '@/domain/print/PrintProfileSchema';
import { validateProfile } from '@/domain/print/validateProfile';

/**
 * Print-profile use cases.
 *
 * The service presents one catalogue made of two sources: the profiles shipped
 * with the app and the ones the user owns. Callers ask for "the profiles" and
 * never learn which is which except through `builtIn`, so a picker cannot
 * accidentally offer half of them.
 *
 * The one rule it enforces everywhere: **a built-in profile is never written
 * to**. Editing one clones it first. That is what keeps a document that says
 * `din5008-b` meaning the same geometry on every machine.
 */
export class PrintProfileService {
  public constructor(private readonly repository: PrintProfileRepository) {}

  /** Every profile the app can render, built-ins first. */
  public async list(): Promise<readonly PrintProfile[]> {
    const own = await this.repository.list();
    return [...BUILT_IN_PROFILES, ...own];
  }

  /** Only the profiles the user owns. */
  public listUserProfiles(): Promise<readonly PrintProfile[]> {
    return this.repository.list();
  }

  /** One profile from either source, or `null`. */
  public async get(id: string): Promise<PrintProfile | null> {
    return findBuiltInProfile(id) ?? (await this.repository.get(id));
  }

  /**
   * One profile, falling back to the default rather than failing.
   *
   * A document that references a profile the user deleted still has to open —
   * losing a profile must not lose the letter. The caller is told through the
   * returned `fallback` flag so the workspace can say what happened.
   */
  public async resolve(id: string): Promise<{ profile: PrintProfile; fallback: boolean }> {
    const profile = await this.get(id);
    if (profile) return { profile, fallback: false };
    const fallback = findBuiltInProfile(DEFAULT_PROFILE_ID);
    if (!fallback) throw new NotFoundError('printProfile');
    return { profile: fallback, fallback: true };
  }

  /** Validation findings for one profile. */
  public validate(profile: PrintProfile): readonly ValidationIssue[] {
    return validateProfile(profile);
  }

  /**
   * Creates an editable copy of any profile.
   *
   * @throws {NotFoundError} When the source profile does not exist.
   */
  public async clone(sourceId: string, name: LocalizedName): Promise<PrintProfile> {
    const source = await this.get(sourceId);
    if (!source) throw new NotFoundError('printProfile');
    const id = await this.freeId(slugifyId(name.en || name.de || sourceId));
    const copy = cloneProfile(source, id, name);
    await this.save(copy);
    return copy;
  }

  /**
   * Stores a user-owned profile.
   *
   * @throws {ImmutableRecordError} When the profile is a built-in.
   * @throws {InvalidInputError} When the profile fails its schema or has blocking issues.
   */
  public async save(profile: PrintProfile): Promise<void> {
    if (profile.builtIn || findBuiltInProfile(profile.id)) {
      throw new ImmutableRecordError('printProfile');
    }
    const parsed = PrintProfileSchema.safeParse(profile);
    if (!parsed.success) throw new InvalidInputError(parsed.error.issues[0]?.path.join('.'));
    if (hasBlockingIssue(validateProfile(profile))) throw new InvalidInputError('geometry');
    await this.repository.save(profile);
  }

  /**
   * Changes the name or margins of a user-owned profile (R13-031). Margins
   * drive the continuation pages and the page numbers; a body region that
   * was the margin box (a plain profile) follows them, while a structured
   * body — the DIN letter's, below the address field — and every other region
   * and marker stay where they are.
   *
   * @throws {NotFoundError} When no profile has the id.
   * @throws {ImmutableRecordError} When the profile is a built-in.
   */
  public async update(
    id: string,
    changes: {
      name?: LocalizedName;
      margins?: MarginsMm;
      /** Turning the sheet (change 0045); refused when a marker or region would leave it. */
      orientation?: PageSizeMm['orientation'];
    },
    now = new Date(),
  ): Promise<PrintProfile> {
    const stored = await this.repository.get(id);
    if (!stored) {
      if (findBuiltInProfile(id)) throw new ImmutableRecordError('printProfile');
      throw new NotFoundError('printProfile');
    }
    // The turn comes first, so the body that follows the margins is measured
    // against the sheet the margins will be applied to.
    const current = changes.orientation ? turnProfile(stored, changes.orientation, now) : stored;
    const margins = changes.margins ?? current.margins;
    const body = current.regions.body;
    const followedMargins = bodyFollowsMargins(current);
    const regions =
      changes.margins && body && followedMargins
        ? {
            ...current.regions,
            body: {
              ...body,
              xMm: margins.leftMm,
              yMm: margins.topMm,
              widthMm: current.page.widthMm - margins.leftMm - margins.rightMm,
              heightMm: current.page.heightMm - margins.topMm - margins.bottomMm,
            },
          }
        : current.regions;
    const next: PrintProfile = {
      ...current,
      name: changes.name ?? current.name,
      margins,
      regions,
      updatedAt: now.toISOString(),
    };
    await this.save(next);
    return next;
  }

  /**
   * Replaces the markers of a user-owned profile (change 0047, R02-001). The
   * fold and bleed claims follow the markers; the geometry check on save
   * refuses a list with a mark outside the sheet or an invalid id, so the
   * stored profile is always one the renderer can draw.
   *
   * @throws {NotFoundError} When no profile has the id.
   * @throws {ImmutableRecordError} When the profile is a built-in.
   * @throws {InvalidInputError} When the markers fail the schema or the geometry check.
   */
  public async updateMarkers(
    id: string,
    markers: readonly PrintMarker[],
    now = new Date(),
  ): Promise<PrintProfile> {
    const current = await this.repository.get(id);
    if (!current) {
      if (findBuiltInProfile(id)) throw new ImmutableRecordError('printProfile');
      throw new NotFoundError('printProfile');
    }
    if (markers.length > MARKERS_MAX) throw new InvalidInputError('markers');
    const next: PrintProfile = {
      ...current,
      markers: markers.map((marker) => ({ ...marker, locked: false })),
      capabilities: capabilitiesFor(current, markers),
      updatedAt: now.toISOString(),
    };
    await this.save(next);
    return next;
  }

  /**
   * Removes a user-owned profile.
   *
   * @throws {ImmutableRecordError} When the id names a built-in.
   */
  public async remove(id: string): Promise<void> {
    if (findBuiltInProfile(id)) throw new ImmutableRecordError('printProfile');
    await this.repository.delete(id);
  }

  /** Removes every user-owned profile. Built-ins are unaffected. */
  public clear(): Promise<void> {
    return this.repository.clear();
  }

  /** An id no profile uses yet, derived from a preferred one. */
  private async freeId(preferred: string): Promise<string> {
    const existing = new Set([
      ...BUILT_IN_PROFILES.map((profile) => profile.id),
      ...(await this.repository.list()).map((profile) => profile.id),
    ]);
    if (!existing.has(preferred)) return preferred;
    for (let suffix = 2; suffix < 1_000; suffix += 1) {
      const candidate = `${preferred}-${suffix}`;
      if (!existing.has(candidate)) return candidate;
    }
    return `${preferred}-${Date.now()}`;
  }
}
