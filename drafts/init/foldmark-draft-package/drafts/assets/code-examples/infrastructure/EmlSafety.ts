export function assertSafeHeaderValue(name: string, value: string): string {
  if (/\r|\n/u.test(value)) throw new Error(`${name} contains a forbidden line break.`);
  return value.trim();
}

export function quoteMimeFilename(filename: string): string {
  const safe = filename.replace(/[\r\n"\\]/gu, '_').slice(0, 180);
  return `"${safe}"`;
}
