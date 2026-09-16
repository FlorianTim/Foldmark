import {
  InvalidInputError,
  LimitReachedError,
  NotFoundError,
} from '@/application/errors/FoldmarkErrors';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type {
  DecodeResult,
  EncodeGeometry,
  MarkdownDocumentCodec,
} from '@/application/ports/MarkdownDocumentCodec';
import type { RenderPlan } from '@/application/render/RenderPlan';
import { buildRenderPlan, type RenderInput } from '@/application/render/buildRenderPlan';
import {
  validateForTarget,
  type TargetValidationInput,
} from '@/application/validation/validateForTarget';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  createDocument,
  duplicateDocument,
  reviseDocument,
  type DocumentKind,
  type FoldmarkDocument,
  type PrintOptions,
} from '@/domain/document/FoldmarkDocument';
import { FoldmarkDocumentSchema } from '@/domain/document/DocumentSchema';
import { migrateDateTokens } from '@/domain/markdown/dateToken';

/**
 * Document use cases.
 *
 * The service owns the *rules around* a document — what a new one starts as,
 * what may be saved, how many may exist — and delegates the rest: layout to the
 * render plan, correctness to the target validation, storage to the repository.
 * Keeping it that thin is what lets the same three collaborators be tested
 * without a browser.
 *
 * Every write revalidates against the schema. The repository does too, and the
 * duplication is intentional: this catches a bug in Foldmark, that one catches
 * a record something else wrote into the same origin's IndexedDB.
 */
export class DocumentService {
  /** How many documents one browser profile may hold. */
  public static readonly MAX_DOCUMENTS = 500;

  public constructor(
    private readonly repository: DocumentRepository,
    private readonly codec: MarkdownDocumentCodec,
  ) {}

  /** Every document, most recently changed first. */
  public list(): Promise<readonly FoldmarkDocument[]> {
    return this.repository.list();
  }

  /**
   * One document.
   *
   * @throws {NotFoundError} When no document is stored under the id.
   */
  public async require(id: string): Promise<FoldmarkDocument> {
    const document = await this.repository.get(id);
    if (!document) throw new NotFoundError('document');
    return migrateBody(document);
  }

  /** One document, or `null`. */
  public async get(id: string): Promise<FoldmarkDocument | null> {
    const document = await this.repository.get(id);
    return document ? migrateBody(document) : null;
  }

  /**
   * Creates and stores an empty document.
   *
   * @throws {LimitReachedError} When the bounded collection is full.
   */
  public async create(input: {
    kind: DocumentKind;
    title: string;
    locale: string;
    printProfileId: string;
    bodyMarkdown?: string;
    date?: string;
    printOptions?: PrintOptions;
  }): Promise<FoldmarkDocument> {
    await this.assertCapacity();
    const document = createDocument(input);
    await this.persist(document);
    return document;
  }

  /**
   * Applies changes to a stored document.
   *
   * @throws {NotFoundError} When the document is gone.
   * @throws {InvalidInputError} When the result would not satisfy the schema.
   */
  public async update(
    id: string,
    changes: Partial<Omit<FoldmarkDocument, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>>,
  ): Promise<FoldmarkDocument> {
    const current = await this.require(id);
    const next = reviseDocument(current, changes);
    await this.persist(next);
    return next;
  }

  /**
   * Copies a document, including its asset placements.
   *
   * @throws {LimitReachedError} When the bounded collection is full.
   */
  public async duplicate(id: string, title: string): Promise<FoldmarkDocument> {
    const source = await this.require(id);
    await this.assertCapacity();
    const copy = duplicateDocument(source, title);
    await this.persist(copy);
    return copy;
  }

  /** Removes one document. Assets and addresses it referenced are untouched. */
  public remove(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /** Renames a document — its name in the workspace, not its subject. */
  public rename(id: string, title: string): Promise<FoldmarkDocument> {
    return this.update(id, { title: title.trim() });
  }

  /** Archives or restores a document (R13-025). Nothing else about it changes. */
  public setArchived(id: string, archived: boolean): Promise<FoldmarkDocument> {
    return this.update(id, { archived });
  }

  /** Moves a document into a folder, or to the top level with `undefined`. */
  public async move(id: string, folderId: string | undefined): Promise<FoldmarkDocument> {
    const current = await this.require(id);
    const next = reviseDocument(current, { folderId });
    if (!folderId) delete (next as { folderId?: string }).folderId;
    await this.persist(next);
    return next;
  }

  /**
   * Records that a document was opened, for the "last opened" sort. Written
   * quietly: it is not an edit, so the modification time stays as it was.
   */
  public async touchOpened(id: string, now = new Date()): Promise<void> {
    const current = await this.repository.get(id);
    if (!current) return;
    await this.repository.save({ ...current, lastOpenedAt: now.toISOString() });
  }

  /** Removes every stored document. */
  public clear(): Promise<void> {
    return this.repository.clear();
  }

  /** The canonical Markdown representation of a document, on the given sheet when known. */
  public encode(document: FoldmarkDocument, geometry?: EncodeGeometry): string {
    return this.codec.encode(document, geometry);
  }

  /**
   * Parses a file the user supplied, without storing it.
   *
   * Import is two steps on purpose: the workspace shows what was understood and
   * what was not, and only then offers to keep it. Storing first and reporting
   * afterwards is how a malformed file quietly becomes a saved document.
   */
  public decode(
    source: string,
    defaults: { id: string; locale: string; printProfileId: string },
  ): DecodeResult {
    return this.codec.decode(source, defaults);
  }

  /**
   * Stores a document that came from a file.
   *
   * @throws {LimitReachedError} When the bounded collection is full.
   * @throws {InvalidInputError} When the document does not satisfy the schema.
   */
  public async importDocument(document: FoldmarkDocument): Promise<FoldmarkDocument> {
    await this.assertCapacity();
    await this.persist(document);
    return document;
  }

  /** The deterministic layout for one document, profile and target. */
  public plan(input: RenderInput): RenderPlan {
    return buildRenderPlan(input);
  }

  /**
   * Everything wrong with a document for one target, most severe first.
   *
   * Combines the target rules with anything the layout discovered, because
   * "the address is missing" and "the body will not fit" belong in one list.
   */
  public validate(
    input: TargetValidationInput & { plan?: RenderPlan },
  ): readonly ValidationIssue[] {
    const issues = [...validateForTarget(input), ...(input.plan?.issues ?? [])];
    const order = { error: 0, warning: 1, info: 2 } as const;
    return issues.sort((left, right) => order[left.severity] - order[right.severity]);
  }

  private async assertCapacity(): Promise<void> {
    const current = await this.repository.list();
    if (current.length >= DocumentService.MAX_DOCUMENTS) {
      throw new LimitReachedError('document', DocumentService.MAX_DOCUMENTS);
    }
  }

  private async persist(document: FoldmarkDocument): Promise<void> {
    const parsed = FoldmarkDocumentSchema.safeParse(document);
    if (!parsed.success) throw new InvalidInputError(parsed.error.issues[0]?.path.join('.'));
    await this.repository.save(document);
  }
}

/**
 * Brings a stored body up to the current spelling (change 0017): the 1.1 date
 * token becomes the `:date[…]` directive. The stored record is left alone; the
 * next save writes the migrated text. Unchanged documents come back as is.
 */
function migrateBody(document: FoldmarkDocument): FoldmarkDocument {
  const body = migrateDateTokens(document.bodyMarkdown);
  return body === document.bodyMarkdown ? document : { ...document, bodyMarkdown: body };
}
