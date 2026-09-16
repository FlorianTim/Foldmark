/**
 * The one-time coupling of title and subject (R13-017, AC-DOC-003).
 *
 * A document's title is its name in the workspace, the subject is a line on
 * the letter. Most letters want them equal, so the first one entered fills
 * the other — once. After that they are two fields: a writer who shortens
 * the title for the list must not see the subject follow, and the other way
 * round. "Entered" means the field was empty (or still the default name a new
 * document was created with) and the other field has never been typed into.
 */

/** What the rule needs to know about the document and the session. */
export interface SyncState {
  readonly title: string;
  readonly subject: string;
  /** The name the document was created with, treated as empty. */
  readonly defaultTitle: string;
  /** Whether the title has been typed into during this session. */
  readonly titleTouched: boolean;
  /** Whether the subject has been typed into during this session. */
  readonly subjectTouched: boolean;
}

/** The fields to write after one edit, and the touch flags to carry on with. */
export interface SyncResult {
  readonly title: string;
  readonly subject: string;
  readonly titleTouched: boolean;
  readonly subjectTouched: boolean;
}

function isEmptyTitle(title: string, defaultTitle: string): boolean {
  const trimmed = title.trim();
  return trimmed === '' || trimmed === defaultTitle.trim();
}

/**
 * The subject was edited: the title follows while it has never been typed
 * into and still reads as "no title" — empty, the default name, or exactly
 * what the subject said a keystroke ago (it was following). Typing happens
 * one character at a time, so "the first entry" is the whole first entry.
 */
export function onSubjectEdited(state: SyncState, subject: string): SyncResult {
  const following = isEmptyTitle(state.title, state.defaultTitle) || state.title === state.subject;
  const follow = !state.titleTouched && following;
  return {
    // A subject cleared while following puts the default name back, so the
    // next entry follows again rather than leaving a stale title behind.
    title: follow ? subject || state.defaultTitle : state.title,
    subject,
    titleTouched: state.titleTouched,
    subjectTouched: true,
  };
}

/** The title was edited: the subject follows while it is empty or was following, and untouched. */
export function onTitleEdited(state: SyncState, title: string): SyncResult {
  const following = state.subject.trim() === '' || state.subject === state.title;
  const follow = !state.subjectTouched && following;
  return {
    title,
    subject: follow ? title : state.subject,
    titleTouched: true,
    subjectTouched: state.subjectTouched,
  };
}
