export interface DocumentRepository {
  get(id: string): Promise<FoldmarkDocument | null>;
  list(): Promise<readonly FoldmarkDocument[]>;
  save(document: FoldmarkDocument): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface MarkdownDocumentCodec {
  decode(source: string): Promise<FoldmarkDocument>;
  encode(document: FoldmarkDocument): Promise<string>;
}

export interface RenderPlanBuilder {
  build(input: RenderInput): Promise<RenderPlan>;
}

export interface Exporter {
  readonly target: ExportTarget;
  export(plan: RenderPlan): Promise<Blob>;
}
