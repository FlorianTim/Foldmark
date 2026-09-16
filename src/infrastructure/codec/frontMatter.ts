/**
 * A deliberately small YAML subset.
 *
 * Foldmark reads front matter out of files people were sent, which makes the
 * parser one of its most exposed components. A general YAML library is a large
 * amount of behaviour to expose there: anchors and aliases can be expanded into
 * a billion nodes, tags can request type construction, merge keys and implicit
 * typing turn `NO` into `false` and `12345` into a number where a postcode was
 * meant.
 *
 * So Foldmark parses only what it emits: a mapping of scalars, nested mappings
 * and sequences of scalars, bounded in depth, size and line count. Everything
 * else — an anchor, an alias, a tag, a block scalar, a flow collection — is
 * **rejected with a message naming the line**, never silently ignored. A user
 * whose file is refused can see why and fix it; a user whose file is silently
 * half-understood cannot.
 *
 * This is a trade. Files from other tools may not parse. In exchange the parser
 * is a hundred lines that can be read in full, and its failure modes are the
 * ones listed below rather than whatever a dependency does next.
 */

/** Anything the subset can represent. */
export type FrontMatterValue =
  | string
  | number
  | boolean
  | null
  | readonly FrontMatterValue[]
  | { readonly [key: string]: FrontMatterValue };

/** Largest front-matter block accepted, in characters. */
export const FRONT_MATTER_MAX_LENGTH = 64 * 1024;

/** Most lines accepted in one front-matter block. */
export const FRONT_MATTER_MAX_LINES = 400;

/** Deepest nesting accepted. `export.pdf.includePhysicalMarks` is depth 3. */
export const FRONT_MATTER_MAX_DEPTH = 4;

/** Longest single line accepted. */
const LINE_MAX_LENGTH = 4_000;

/** Indentation of one nesting level, in spaces. */
const INDENT = 2;

/** A parse failure, with the line that caused it. */
export class FrontMatterError extends Error {
  /**
   * @param code Translation-key suffix under `errors.frontMatter.`.
   * @param line One-based line number inside the front-matter block.
   */
  public constructor(
    public readonly code: string,
    public readonly line: number,
  ) {
    super(`${code} at line ${line}`);
    this.name = 'FrontMatterError';
  }
}

/**
 * What counts as a number, on read and on write.
 *
 * One constant rather than two literals: the parser and the emitter have to
 * agree, or a postcode written unquoted comes back as an integer.
 *
 * Linear — the optional fractional group cannot overlap the integer part.
 */
// eslint-disable-next-line security/detect-unsafe-regex
const NUMERIC_SCALAR = /^-?\d+(?:\.\d+)?$/u;

/** Keys that must never become properties of a parsed object. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Constructs that exist in YAML and are refused here, with the reason they are refused. */
const REJECTED_PREFIXES: readonly { readonly prefix: string; readonly code: string }[] = [
  { prefix: '&', code: 'anchorNotSupported' },
  { prefix: '*', code: 'aliasNotSupported' },
  { prefix: '!', code: 'tagNotSupported' },
  { prefix: '|', code: 'blockScalarNotSupported' },
  { prefix: '>', code: 'blockScalarNotSupported' },
  { prefix: '{', code: 'flowMappingNotSupported' },
  { prefix: '[', code: 'flowSequenceNotSupported' },
];

interface Line {
  readonly indent: number;
  readonly text: string;
  readonly number: number;
}

/**
 * How a flow collection (`[a, b]`, `{a: b}`) is handled.
 *
 * By default it is refused like every other unsupported construct. A caller
 * that would rather keep the rest of the file — the document codec importing
 * a Pandoc header — passes `onDropped`, and the offending **key** is dropped
 * and reported while everything else is read (change 0017). The subset itself
 * does not grow: nothing inside the brackets is ever interpreted.
 */
export interface ParseOptions {
  readonly onDropped?: (key: string, line: number, code: string) => void;
}

/** A value the parser skipped on request; never stored. */
const DROPPED = Symbol('dropped');

/** Prefixes that open a flow collection, the only constructs that may be dropped rather than refused. */
const FLOW_PREFIXES = new Set(['{', '[']);

function toLines(source: string): readonly Line[] {
  const raw = source.replaceAll('\r\n', '\n').split('\n');
  const lines: Line[] = [];
  for (const [index, value] of raw.entries()) {
    const number = index + 1;
    if (value.length > LINE_MAX_LENGTH) throw new FrontMatterError('lineTooLong', number);
    if (value.includes('\t')) throw new FrontMatterError('tabIndentation', number);
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = value.length - value.trimStart().length;
    if (indent % INDENT !== 0) throw new FrontMatterError('indentation', number);
    lines.push({ indent: indent / INDENT, text: trimmed, number });
  }
  return lines;
}

/** Parses one scalar, rejecting the YAML constructs the subset does not allow. */
function parseScalar(
  raw: string,
  line: number,
  key = '',
  options: ParseOptions = {},
): FrontMatterValue | typeof DROPPED {
  const value = raw.trim();
  if (!value) return '';

  for (const { prefix, code } of REJECTED_PREFIXES) {
    if (!value.startsWith(prefix)) continue;
    if (options.onDropped && FLOW_PREFIXES.has(prefix) && key) {
      options.onDropped(key, line, code);
      return DROPPED;
    }
    throw new FrontMatterError(code, line);
  }

  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return unescapeDoubleQuoted(value.slice(1, -1), line);
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }

  // Unquoted scalars are typed conservatively: only the exact literals below
  // become non-strings. `Yes`, `NO` and `~` stay text, because a document that
  // says `city: NO` means Norway.
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (NUMERIC_SCALAR.test(value)) return Number(value);
  return value;
}

function unescapeDoubleQuoted(value: string, line: number): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      result += character;
      continue;
    }
    const next = value[index + 1];
    index += 1;
    switch (next) {
      case 'n':
        result += '\n';
        break;
      case 't':
        result += '\t';
        break;
      case '"':
        result += '"';
        break;
      case '\\':
        result += '\\';
        break;
      default:
        throw new FrontMatterError('unsupportedEscape', line);
    }
  }
  return result;
}

function splitKey(text: string, line: number): { key: string; rest: string } {
  const separator = text.indexOf(':');
  if (separator < 0) throw new FrontMatterError('expectedKey', line);
  const key = text.slice(0, separator).trim();
  if (!key) throw new FrontMatterError('emptyKey', line);
  if (FORBIDDEN_KEYS.has(key)) throw new FrontMatterError('forbiddenKey', line);
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(key)) throw new FrontMatterError('invalidKey', line);
  return { key, rest: text.slice(separator + 1).trim() };
}

function parseBlock(
  lines: readonly Line[],
  start: number,
  indent: number,
  depth: number,
  options: ParseOptions,
): { value: Record<string, FrontMatterValue>; next: number } {
  if (depth > FRONT_MATTER_MAX_DEPTH) {
    throw new FrontMatterError('tooDeep', lines[start]?.number ?? 0);
  }
  // A null-prototype object: nothing parsed from a file should ever inherit
  // `toString` or be able to reach `Object.prototype`.
  const value: Record<string, FrontMatterValue> = Object.create(null);
  let index = start;

  while (index < lines.length && lines[index].indent >= indent) {
    const line = lines[index];
    if (line.indent > indent) throw new FrontMatterError('indentation', line.number);
    if (line.text.startsWith('- ') || line.text === '-') {
      throw new FrontMatterError('unexpectedSequenceItem', line.number);
    }

    const { key, rest } = splitKey(line.text, line.number);
    if (Object.hasOwn(value, key)) throw new FrontMatterError('duplicateKey', line.number);
    index += 1;

    if (rest) {
      const scalar = parseScalar(rest, line.number, key, options);
      if (scalar !== DROPPED) value[key] = scalar;
      continue;
    }

    const child = lines[index];
    if (!child || child.indent <= indent) {
      value[key] = null;
      continue;
    }
    if (child.indent !== indent + 1) throw new FrontMatterError('indentation', child.number);

    if (child.text.startsWith('- ') || child.text === '-') {
      const items: FrontMatterValue[] = [];
      let dropped = false;
      while (index < lines.length && lines[index].indent === indent + 1) {
        const item = lines[index];
        if (!item.text.startsWith('- ') && item.text !== '-') break;
        const scalar =
          item.text === '-' ? '' : parseScalar(item.text.slice(2), item.number, key, options);
        if (scalar === DROPPED) dropped = true;
        else items.push(scalar);
        index += 1;
      }
      // A list with one dropped item is dropped whole: half a list is a lie.
      if (!dropped) value[key] = items;
      continue;
    }

    const nested = parseBlock(lines, index, indent + 1, depth + 1, options);
    value[key] = nested.value;
    index = nested.next;
  }

  return { value, next: index };
}

/**
 * Parses a front-matter block.
 *
 * @param source The text between the `---` fences, without them.
 * @param options Whether flow collections are dropped and reported instead of refused.
 * @throws {FrontMatterError} On anything outside the supported subset.
 */
export function parseFrontMatter(
  source: string,
  options: ParseOptions = {},
): Record<string, FrontMatterValue> {
  if (source.length > FRONT_MATTER_MAX_LENGTH) throw new FrontMatterError('tooLarge', 1);
  const lines = toLines(source);
  if (lines.length > FRONT_MATTER_MAX_LINES) throw new FrontMatterError('tooManyLines', 1);
  if (lines.length === 0) return Object.create(null) as Record<string, FrontMatterValue>;
  if (lines[0].indent !== 0) throw new FrontMatterError('indentation', lines[0].number);
  return parseBlock(lines, 0, 0, 1, options).value;
}

/** Whether a scalar can be written without quotes and read back unchanged. */
function needsQuoting(value: string): boolean {
  if (value === '') return true;
  if (value.trim() !== value) return true;
  if (value === 'true' || value === 'false' || value === 'null') return true;
  if (NUMERIC_SCALAR.test(value)) return true;
  return /[:#"'\n\r\t[\]{}&*!|>%@`,]/u.test(value);
}

function emitScalar(value: FrontMatterValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  const text = String(value);
  if (!needsQuoting(text)) return text;
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`;
}

/**
 * Serializes a value tree back to the subset.
 *
 * Round-trip safe by construction: it emits only what {@link parseFrontMatter}
 * accepts, and quotes anything whose unquoted form would parse back as
 * something else — which is how a postcode stays `"12345"` rather than becoming
 * the number 12345.
 */
export function emitFrontMatter(value: Record<string, FrontMatterValue>, indent = 0): string {
  const pad = ' '.repeat(indent * INDENT);
  const lines: string[] = [];

  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (Array.isArray(entry)) {
      if (entry.length === 0) continue;
      lines.push(`${pad}${key}:`);
      for (const item of entry) lines.push(`${pad}  - ${emitScalar(item as FrontMatterValue)}`);
      continue;
    }
    if (entry !== null && typeof entry === 'object') {
      const nested = emitFrontMatter(entry as Record<string, FrontMatterValue>, indent + 1);
      if (!nested.trim()) continue;
      lines.push(`${pad}${key}:`);
      lines.push(nested.replace(/\n$/u, ''));
      continue;
    }
    lines.push(`${pad}${key}: ${emitScalar(entry)}`);
  }

  return lines.length ? `${lines.join('\n')}\n` : '';
}

/** The front-matter block and the body, split at the closing fence. */
export interface SplitDocument {
  /** Raw front-matter text, or `null` when the file has none. */
  readonly frontMatter: string | null;
  readonly body: string;
}

/**
 * Splits a file into front matter and body.
 *
 * A file with an opening fence and no closing one is an **error**, not a file
 * without front matter: treating it as a body would silently turn somebody's
 * metadata into the first paragraph of their letter.
 *
 * @throws {FrontMatterError} When the front matter is opened and never closed.
 */
export function splitFrontMatter(source: string): SplitDocument {
  const normalized = source.replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) return { frontMatter: null, body: normalized };

  const end = normalized.indexOf('\n---', 3);
  if (end < 0) throw new FrontMatterError('unterminated', 1);

  const afterFence = normalized.slice(end + 4);
  if (afterFence && !afterFence.startsWith('\n')) throw new FrontMatterError('unterminated', 1);

  return {
    frontMatter: normalized.slice(4, end + 1),
    body: afterFence.replace(/^\n/u, ''),
  };
}
