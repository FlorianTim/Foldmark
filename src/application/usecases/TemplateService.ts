import {
  InvalidInputError,
  LimitReachedError,
  NotFoundError,
} from '@/application/errors/FoldmarkErrors';
import type { TemplateRepository } from '@/application/ports/TemplateRepository';
import { DocumentTemplateSchema } from '@/domain/document/DocumentSchema';
import {
  compareTemplates,
  createTemplateFromDocument,
  TEMPLATES_MAX_COUNT,
  type DocumentTemplate,
  type TemplateOptions,
} from '@/domain/document/DocumentTemplate';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import {
  canUseFeature,
  featureState,
  type FeatureEntitlement,
} from '@/domain/entitlement/premiumFeatures';

/**
 * Template use cases (change 0039): save one from a document, list, rename,
 * delete. Instantiating a template is `documentFromTemplate` plus the ordinary
 * document store, so the workspace does it where it opens documents.
 *
 * The premium gate for a second template is asked **here** (C12): the dialog
 * may show a note, but whether a template is written is this method's
 * decision. During the test phase the answer is always yes.
 */
export class TemplateService {
  public constructor(private readonly templates: TemplateRepository) {}

  /** Every template, by name. */
  public async list(): Promise<readonly DocumentTemplate[]> {
    return [...(await this.templates.list())].sort(compareTemplates);
  }

  public get(id: string): Promise<DocumentTemplate | null> {
    return this.templates.get(id);
  }

  /** The premium state of saving one more template, given how many exist. */
  public async stateForAnother(): Promise<FeatureEntitlement> {
    const count = (await this.templates.list()).length;
    return featureState('template.custom.multiple', count);
  }

  /**
   * Takes a template from a document.
   *
   * @throws {LimitReachedError} When the collection is full or the feature is locked.
   * @throws {InvalidInputError} When the name is empty.
   */
  public async saveFromDocument(
    document: FoldmarkDocument,
    options: TemplateOptions,
    now = new Date(),
  ): Promise<DocumentTemplate> {
    const existing = await this.templates.list();
    if (existing.length >= TEMPLATES_MAX_COUNT) {
      throw new LimitReachedError('template', TEMPLATES_MAX_COUNT);
    }
    const state = featureState('template.custom.multiple', existing.length);
    if (!canUseFeature(state)) throw new LimitReachedError('template', state.limit ?? 1);
    const template = createTemplateFromDocument(document, options, now);
    this.assertValid(template);
    await this.templates.save(template);
    return template;
  }

  /** Renames a template or changes its description. */
  public async update(
    id: string,
    changes: { readonly name?: string; readonly description?: string },
    now = new Date(),
  ): Promise<DocumentTemplate> {
    const current = await this.require(id);
    const description = changes.description?.trim();
    const next: DocumentTemplate = {
      ...current,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.description !== undefined
        ? description
          ? { description }
          : { description: undefined }
        : {}),
      updatedAt: now.toISOString(),
    };
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined),
    ) as unknown as DocumentTemplate;
    this.assertValid(cleaned);
    await this.templates.save(cleaned);
    return cleaned;
  }

  public async remove(id: string): Promise<void> {
    await this.require(id);
    await this.templates.delete(id);
  }

  private async require(id: string): Promise<DocumentTemplate> {
    const template = await this.templates.get(id);
    if (!template) throw new NotFoundError('template');
    return template;
  }

  private assertValid(template: DocumentTemplate): void {
    const result = DocumentTemplateSchema.safeParse(template);
    if (!result.success) {
      throw new InvalidInputError(result.error.issues[0]?.path.join('.') ?? 'template');
    }
  }
}
