import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';

/** Persistence for document templates (change 0039). */
export interface TemplateRepository {
  get(id: string): Promise<DocumentTemplate | null>;
  /** Every template, in no particular order; the domain sorts by name. */
  list(): Promise<readonly DocumentTemplate[]>;
  save(template: DocumentTemplate): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
