import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { services } from '@/app/compositionRoot';
import { FoldmarkError } from '@/application/errors/FoldmarkErrors';
import type { RenderPlan } from '@/application/render/RenderPlan';
import {
  senderProfileFromSnapshot,
  senderSnapshotOf,
  type SenderProfile,
} from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  categoryForKind,
  reviseDocument,
  type DocumentKind,
  type FoldmarkDocument,
} from '@/domain/document/FoldmarkDocument';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import { WORKING_COPY_DEBOUNCE_MS, type WorkingCopy } from '@/domain/document/History';
import {
  onSubjectEdited,
  onTitleEdited,
  type SyncResult,
  type SyncState,
} from '@/domain/document/documentSync';
import {
  documentFromTemplate,
  type DocumentTemplate,
  type TemplateOptions,
} from '@/domain/document/DocumentTemplate';
import type { LetterBlockName } from '@/domain/markdown/directives';
import { replaceLetterBlock } from '@/domain/markdown/letterBlocks';
import { todayIso } from '@/domain/markdown/dateToken';
import { DEFAULT_PROFILE_ID } from '@/domain/print/builtInProfiles';
import type { PrintProfile } from '@/domain/print/PrintProfile';
import { printOptionsFromDefaults } from '@/presentation/settings/documentDefaults';
import { appSettings, readSetting } from '@/presentation/settings/settingsRegistry';
import { deriveSaveStatus } from '@/presentation/stores/saveStatus';

/**
 * The document currently being edited.
 *
 * The store holds a **working copy**. Edits change it immediately; the stored
 * record is written on save, and a copy of the working state is written
 * automatically shortly after every change (change 0008) so a closed tab
 * loses nothing. `dirty` says whether the record is behind; `pendingEdits`
 * whether the automatic copy is. Manual saves take a checkpoint (0009).
 *
 * The render plan and the validation findings are `computed`. They are pure
 * functions of the working copy, the profile and the target, so deriving them
 * is both cheaper and safer than keeping them in sync by hand — there is no
 * state that can be stale, because there is no state.
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  const document = ref<FoldmarkDocument | null>(null);
  const profile = ref<PrintProfile | null>(null);
  const sender = ref<SenderProfile | null>(null);
  const assets = ref<readonly DocumentAsset[]>([]);
  const target = ref<ExportTarget>('print');
  const surfaceIndex = ref(0);

  const dirty = ref(false);
  const loading = ref(false);
  /** A save is in flight. */
  const saving = ref(false);
  /** Translation key of the failure that ended the last save, cleared by the next edit or save. */
  const saveError = ref<string | null>(null);
  /** When the working copy last matched storage; `null` for a document created this session. */
  const lastSavedAt = ref<Date | null>(null);
  /** When the automatic copy was last written; `null` until the first edit is copied. */
  const autosavedAt = ref<Date | null>(null);
  /** Edits since the automatic copy was written. */
  const pendingEdits = ref(false);
  /** A newer working copy found on open, waiting for the user's decision. */
  const recovery = ref<WorkingCopy | null>(null);
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Translation key of the last failure, or `null`. */
  const error = ref<string | null>(null);
  /** Set when the document referenced a profile that no longer exists. */
  const profileFallback = ref(false);
  /** The name the open document was created with; counts as "no title" for the sync rule. */
  const defaultTitle = ref('');
  /** Whether title and subject were typed into this session (one-time sync, R13-017). */
  const titleTouched = ref(false);
  const subjectTouched = ref(false);

  /** Whether a document is open. */
  const isOpen = computed(() => document.value !== null);

  /** New, unsaved, saving, saved or error — see `saveStatus.ts`. */
  const saveStatus = computed(() =>
    deriveSaveStatus({
      open: isOpen.value,
      dirty: dirty.value,
      saving: saving.value,
      saveError: saveError.value,
      lastSavedAt: lastSavedAt.value,
      autosavedAt: autosavedAt.value,
      pendingEdits: pendingEdits.value,
    }),
  );

  /**
   * The layout for the current document, as it will be printed.
   *
   * Built in `screen` mode: preview-only guides are drawn, printed marks follow
   * the profile. The export path builds its own plan in `paper` mode from the
   * same inputs, so what is exported is never derived from what is displayed.
   */
  const plan = computed<RenderPlan | null>(() => {
    if (!document.value || !profile.value) return null;
    return services.documents.plan({
      document: document.value,
      profile: profile.value,
      target: target.value,
      mode: 'screen',
      sender: sender.value ?? undefined,
      assets: assets.value,
    });
  });

  /**
   * The layout as the **printer** receives it.
   *
   * Built separately, in `paper` mode, and rendered into a print-only copy of
   * the document. Printing the on-screen preview would put preview-only guides
   * — safe areas, stamp boxes — onto the page, and hiding them with a print
   * stylesheet would mean the CSS, not the profile, decided what prints.
   */
  const printPlan = computed<RenderPlan | null>(() => {
    if (!document.value || !profile.value) return null;
    return services.documents.plan({
      document: document.value,
      profile: profile.value,
      target: 'print',
      mode: 'paper',
      sender: sender.value ?? undefined,
      assets: assets.value,
    });
  });

  /** Everything wrong with the document for the selected target, most severe first. */
  const issues = computed<readonly ValidationIssue[]>(() => {
    if (!document.value || !profile.value) return [];
    return services.documents.validate({
      document: document.value,
      profile: profile.value,
      target: target.value,
      assets: assets.value,
      hasSender: sender.value !== null,
      plan: plan.value ?? undefined,
    });
  });

  /** Issues that block the selected target. */
  const blockingIssues = computed(() => issues.value.filter((issue) => issue.severity === 'error'));

  async function run<T>(operation: () => Promise<T>, fallbackKey: string): Promise<T | null> {
    error.value = null;
    try {
      return await operation();
    } catch (caught) {
      error.value = caught instanceof FoldmarkError ? caught.translationKey : fallbackKey;
      return null;
    }
  }

  /** `run` for components that act on the workspace: same error channel, no fallback key to pick. */
  function runQuietly<T>(operation: () => Promise<T>): Promise<T | null> {
    return run(operation, 'errors.storageUnavailable');
  }

  /**
   * The sender the renderer gets.
   *
   * The snapshot in the document wins (ADR 0017); the source address, while it
   * still exists, only contributes letterhead and signature. A pre-0006
   * document has no snapshot and is resolved through its source id instead.
   */
  async function resolveSender(next: FoldmarkDocument): Promise<SenderProfile | null> {
    const sourceId = next.metadata.senderProfileId;
    const source = sourceId ? await services.addressBook.get(sourceId) : null;
    if (next.metadata.sender) {
      return senderProfileFromSnapshot(next.metadata.sender, source, sourceId);
    }
    return sourceId ? await services.addressBook.getSender(sourceId) : null;
  }

  /** Resolves the profile, sender and assets a document depends on. */
  async function resolveContext(next: FoldmarkDocument): Promise<void> {
    const resolved = await services.printProfiles.resolve(next.printProfileId);
    profile.value = resolved.profile;
    profileFallback.value = resolved.fallback;

    sender.value = await resolveSender(next);
    assets.value = await services.assets.list();
    surfaceIndex.value = 0;
  }

  /** Opens a stored document as the working copy. */
  async function open(id: string): Promise<void> {
    loading.value = true;
    const next = await run(() => services.documents.require(id), 'errors.notFound');
    if (next) {
      // Opening is recorded for the "last opened" sort, quietly: not an edit.
      const openedAt = new Date().toISOString();
      void services.documents.touchOpened(id, new Date(openedAt));
      document.value = { ...next, lastOpenedAt: openedAt };
      defaultTitle.value = '';
      titleTouched.value = false;
      subjectTouched.value = false;
      await run(() => resolveContext(next), 'errors.storageUnavailable');
      dirty.value = false;
      saveError.value = null;
      lastSavedAt.value = new Date(next.updatedAt);
      autosavedAt.value = null;
      pendingEdits.value = false;
      recovery.value = await run(
        () => services.history.recoverableCopy(next),
        'errors.storageUnavailable',
      );
    }
    loading.value = false;
  }

  /**
   * The profile a new document of this kind should start on.
   *
   * The configured default only applies when it suits the kind. A postcard
   * created on the default *letter* profile has one side and no address region,
   * which looks like a broken app rather than a wrong setting — so the kind
   * wins, and the setting applies to everything it fits.
   */
  async function profileForKind(kind: DocumentKind): Promise<string> {
    const configured = readSetting(appSettings.defaultPrintProfileId) || DEFAULT_PROFILE_ID;
    const wanted = categoryForKind(kind);
    const catalogue = await services.printProfiles.list();

    const preferred = catalogue.find((candidate) => candidate.id === configured);
    if (preferred?.category === wanted) return preferred.id;

    return catalogue.find((candidate) => candidate.category === wanted)?.id ?? configured;
  }

  /** Creates a document, stores it, and opens it. */
  async function create(input: {
    kind: DocumentKind;
    title: string;
    /** The document language; the configured default when absent (change 0028). */
    locale?: string;
  }): Promise<string | null> {
    const defaults = readSetting(appSettings.documentDefaults);
    const preferredProfile = await profileForKind(input.kind);
    // The primary address is the sender a new letter starts with; the older
    // default-sender setting still applies where no address is primary.
    const primary = await services.addressBook.primary();
    const defaultSender = primary?.id || readSetting(appSettings.defaultSenderProfileId);

    const created = await run(
      () =>
        services.documents.create({
          kind: input.kind,
          title: input.title,
          locale: input.locale ?? defaults.locale,
          printProfileId: preferredProfile,
          // A letter carries today's date from the start; it can be changed or hidden.
          date: input.kind === 'letter' ? todayIso() : undefined,
          printOptions: printOptionsFromDefaults(defaults),
        }),
      'errors.storageUnavailable',
    );
    if (!created) return null;

    const defaultAddress = defaultSender ? await services.addressBook.get(defaultSender) : null;
    const withSender = defaultAddress
      ? await run(
          () =>
            services.documents.update(created.id, {
              metadata: {
                senderProfileId: defaultAddress.id,
                sender: senderSnapshotOf(defaultAddress),
              },
            }),
          'errors.storageUnavailable',
        )
      : created;

    const opened = withSender ?? created;
    document.value = opened;
    defaultTitle.value = input.title;
    titleTouched.value = false;
    subjectTouched.value = false;
    await run(() => resolveContext(opened), 'errors.storageUnavailable');
    dirty.value = false;
    saveError.value = null;
    lastSavedAt.value = null;
    autosavedAt.value = null;
    pendingEdits.value = false;
    recovery.value = null;
    return opened.id;
  }

  /**
   * A new document from a template (change 0039): the template's sender,
   * theme, body and profile, its own id and today's date, nothing shared with
   * the template afterwards. A profile the template names but the catalogue no
   * longer has falls back to the kind's default.
   */
  async function createFromTemplate(
    templateId: string,
    input: { title: string; folderId?: string } & Partial<Pick<DocumentTemplate, 'kind'>>,
  ): Promise<string | null> {
    const template = await run(
      () => services.templates.get(templateId),
      'errors.storageUnavailable',
    );
    if (!template) return null;
    const catalogue = await services.printProfiles.list();
    const profileExists = catalogue.some((profile) => profile.id === template.printProfileId);
    const created = await run(
      () =>
        services.documents.importDocument(
          documentFromTemplate(template, {
            title: input.title,
            date: template.kind === 'letter' ? todayIso() : undefined,
            ...(profileExists ? {} : { printProfileId: undefined }),
            ...(input.folderId ? { folderId: input.folderId } : {}),
          }),
        ),
      'errors.storageUnavailable',
    );
    if (!created) return null;
    const opened = profileExists
      ? created
      : ((await run(
          async () =>
            services.documents.update(created.id, {
              printProfileId: await profileForKind(created.kind),
            }),
          'errors.storageUnavailable',
        )) ?? created);
    document.value = opened;
    defaultTitle.value = input.title;
    titleTouched.value = false;
    subjectTouched.value = Boolean(opened.metadata.subject);
    await run(() => resolveContext(opened), 'errors.storageUnavailable');
    dirty.value = false;
    saveError.value = null;
    lastSavedAt.value = null;
    autosavedAt.value = null;
    pendingEdits.value = false;
    recovery.value = null;
    return opened.id;
  }

  /** Takes a template from the open document, after the working copy is flushed. */
  async function saveAsTemplate(options: TemplateOptions): Promise<DocumentTemplate | null> {
    const current = document.value;
    if (!current) return null;
    await flushWorkingCopy();
    return run(
      () => services.templates.saveFromDocument(current, options),
      'errors.storageUnavailable',
    );
  }

  /**
   * Applies changes to the working copy without touching storage.
   *
   * The timestamp moves here too, so the preview and the saved record cannot
   * disagree about when the document last changed.
   */
  function patch(
    changes: Partial<Omit<FoldmarkDocument, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>>,
  ): void {
    if (!document.value) return;
    document.value = reviseDocument(document.value, changes);
    dirty.value = true;
    pendingEdits.value = true;
    saveError.value = null;
    scheduleWorkingCopy();
  }

  /** Arms the debounced automatic copy; every edit pushes it back. */
  function scheduleWorkingCopy(): void {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => void flushWorkingCopy(), WORKING_COPY_DEBOUNCE_MS);
  }

  /**
   * Writes the working copy now — after the debounce, when the tab goes into
   * the background, or before closing. Overwrites the previous copy; never a
   * version of its own, though it may trigger the automatic checkpoint rule.
   */
  async function flushWorkingCopy(): Promise<void> {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    const current = document.value;
    if (!current || !pendingEdits.value) return;
    saving.value = true;
    const written = await run(async () => {
      await services.history.saveWorkingCopy(current);
      await services.history.checkpointIfDue(current);
      return true;
    }, 'errors.storageUnavailable');
    saving.value = false;
    if (written) {
      pendingEdits.value = false;
      autosavedAt.value = new Date();
    }
  }

  /** Continues from the working copy found on open. */
  function acceptRecovery(): void {
    const copy = recovery.value;
    if (!copy) return;
    document.value = copy.document;
    dirty.value = true;
    autosavedAt.value = new Date(copy.savedAt);
    pendingEdits.value = false;
    recovery.value = null;
  }

  /** Drops the working copy found on open and keeps the stored record. */
  async function discardRecovery(): Promise<void> {
    const copy = recovery.value;
    if (!copy) return;
    recovery.value = null;
    await run(
      () => services.history.discardWorkingCopy(copy.documentId),
      'errors.storageUnavailable',
    );
  }

  /** Applies changes to the document metadata, merging rather than replacing. */
  function patchMetadata(changes: Partial<FoldmarkDocument['metadata']>): void {
    if (!document.value) return;
    patch({ metadata: { ...document.value.metadata, ...changes } });
  }

  function syncState(): SyncState {
    return {
      title: document.value?.title ?? '',
      subject: document.value?.metadata.subject ?? '',
      defaultTitle: defaultTitle.value,
      titleTouched: titleTouched.value,
      subjectTouched: subjectTouched.value,
    };
  }

  function applySync(result: SyncResult): void {
    if (!document.value) return;
    titleTouched.value = result.titleTouched;
    subjectTouched.value = result.subjectTouched;
    patch({
      title: result.title,
      metadata: { ...document.value.metadata, subject: result.subject || undefined },
    });
  }

  /** The title field: the subject follows once when it is still empty (R13-017). */
  function setTitle(title: string): void {
    applySync(onTitleEdited(syncState(), title));
  }

  /** The subject field: the title follows once when it is still the default name. */
  function setSubject(subject: string): void {
    applySync(onSubjectEdited(syncState(), subject));
  }

  /**
   * The salutation or closing from the letter details (R13-019): the words go
   * into the metadata and into the body's block in one edit.
   */
  function setLetterBlock(name: LetterBlockName, text: string): void {
    if (!document.value) return;
    patch({
      bodyMarkdown: replaceLetterBlock(document.value.bodyMarkdown, name, text),
      metadata: { ...document.value.metadata, [name]: text.trim() || undefined },
    });
  }

  /** Switches the print profile of the working copy and re-resolves it. */
  async function selectProfile(id: string): Promise<void> {
    if (!document.value) return;
    patch({ printProfileId: id });
    const resolved = await services.printProfiles.resolve(id);
    profile.value = resolved.profile;
    profileFallback.value = resolved.fallback;
    surfaceIndex.value = 0;
  }

  /**
   * Chooses the sender of the working copy: copies the address into the
   * document as a snapshot and remembers where it came from.
   */
  async function selectSender(id: string | null): Promise<void> {
    if (!document.value) return;
    const metadata = { ...document.value.metadata };
    const address = id ? await services.addressBook.get(id) : null;
    if (address) {
      metadata.senderProfileId = address.id;
      metadata.sender = senderSnapshotOf(address);
      await services.addressBook.touch(address.id);
    } else {
      delete metadata.senderProfileId;
      delete metadata.sender;
    }
    patch({ metadata });
    sender.value = await resolveSender({ ...document.value, metadata });
  }

  /** Re-copies the sender from its address-book entry, an explicit user action. */
  async function refreshSenderFromSource(): Promise<void> {
    const id = document.value?.metadata.senderProfileId;
    if (id) await selectSender(id);
  }

  /**
   * Takes the recipient's postal address from its contact again (R14-012):
   * local edits to the snapshot are discarded, the directory entry stays as it
   * is. A contact that no longer exists leaves the snapshot alone.
   */
  async function refreshRecipientFromSource(): Promise<void> {
    const id = document.value?.metadata.recipientContactId;
    if (!id) return;
    const address = await services.addressBook.get(id);
    if (address) {
      patchMetadata({
        recipient: { ...address.postal },
        // The hand-off address follows the contact as well (no field of its own since 2026-09-17).
        emailTo: address.email ?? document.value?.metadata.emailTo,
      });
    }
  }

  /**
   * Writes the working copy to storage.
   *
   * Saving a clean document is allowed and harmless: it re-confirms the state
   * and refreshes the time shown next to "saved", which is what a user who
   * clicks Save "to be sure" is asking for.
   */
  async function save(): Promise<boolean> {
    if (!document.value || saving.value) return false;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    saving.value = true;
    const saved = await run(
      () => services.documents.update(document.value!.id, stripIdentity(document.value!)),
      'errors.storageUnavailable',
    );
    if (!saved) {
      saving.value = false;
      saveError.value = error.value ?? 'errors.storageUnavailable';
      return false;
    }
    // A manual save is a durable checkpoint; the automatic copy is obsolete.
    await run(async () => {
      await services.history.checkpoint(saved, 'manual');
      await services.history.discardWorkingCopy(saved.id);
    }, 'errors.storageUnavailable');
    saving.value = false;
    document.value = saved;
    dirty.value = false;
    pendingEdits.value = false;
    autosavedAt.value = null;
    saveError.value = null;
    lastSavedAt.value = new Date(saved.updatedAt);
    return true;
  }

  /** Replaces the working copy with a version from the history. */
  async function replaceWith(next: FoldmarkDocument): Promise<void> {
    document.value = next;
    await run(() => resolveContext(next), 'errors.storageUnavailable');
    dirty.value = false;
    pendingEdits.value = false;
    autosavedAt.value = null;
    saveError.value = null;
    lastSavedAt.value = new Date(next.updatedAt);
  }

  /** Re-reads the asset list, after an import or a deletion elsewhere. */
  async function refreshAssets(): Promise<void> {
    const list = await run(() => services.assets.list(), 'errors.storageUnavailable');
    if (list) assets.value = list;
  }

  /**
   * Closes the working copy. Pending edits are written to the automatic copy
   * first, so closing never loses work; the record itself stays as saved.
   */
  async function close(): Promise<void> {
    await flushWorkingCopy();
    document.value = null;
    profile.value = null;
    sender.value = null;
    assets.value = [];
    dirty.value = false;
    saving.value = false;
    saveError.value = null;
    lastSavedAt.value = null;
    autosavedAt.value = null;
    pendingEdits.value = false;
    recovery.value = null;
    error.value = null;
    profileFallback.value = false;
  }

  /** Selects which surface of a duplex profile the preview shows. */
  function selectSurface(index: number): void {
    surfaceIndex.value = index;
  }

  return {
    document,
    profile,
    sender,
    assets,
    target,
    surfaceIndex,
    dirty,
    loading,
    saving,
    saveError,
    lastSavedAt,
    autosavedAt,
    pendingEdits,
    recovery,
    saveStatus,
    error,
    profileFallback,
    isOpen,
    plan,
    printPlan,
    issues,
    blockingIssues,
    open,
    create,
    createFromTemplate,
    saveAsTemplate,
    patch,
    patchMetadata,
    setTitle,
    setSubject,
    setLetterBlock,
    selectProfile,
    selectSender,
    refreshSenderFromSource,
    refreshRecipientFromSource,
    selectSurface,
    save,
    flushWorkingCopy,
    acceptRecovery,
    discardRecovery,
    replaceWith,
    runQuietly,
    refreshAssets,
    close,
  };
});

/**
 * The mutable half of a document — everything except its identity and timestamps.
 *
 * Listed explicitly rather than produced by rest-destructuring: a field added to
 * the document later should have to be considered here, not silently carried
 * into a save that was meant to be partial.
 */
function stripIdentity(
  document: FoldmarkDocument,
): Partial<Omit<FoldmarkDocument, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>> {
  return {
    kind: document.kind,
    title: document.title,
    locale: document.locale,
    bodyMarkdown: document.bodyMarkdown,
    metadata: document.metadata,
    surfaces: document.surfaces,
    assetPlacements: document.assetPlacements,
    printProfileId: document.printProfileId,
    exportPreferences: document.exportPreferences,
    tags: document.tags,
    preserved: document.preserved,
    folderId: document.folderId,
    archived: document.archived,
    lastOpenedAt: document.lastOpenedAt,
    demoData: document.demoData,
  };
}
