import { appConfig } from '@/config';

/** Namespaces one UI preference so generated applications cannot collide on shared origins. */
export function preferenceKey(name: string): string {
  return `${appConfig.slug}:ui:${name}`;
}

/** Reads a local preference and degrades safely when browser storage is blocked. */
export function readPreference(name: string): string | null {
  try {
    return window.localStorage.getItem(preferenceKey(name));
  } catch {
    return null;
  }
}

/** Writes a local preference and reports whether persistence succeeded. */
export function writePreference(name: string, value: string): boolean {
  try {
    window.localStorage.setItem(preferenceKey(name), value);
    return true;
  } catch {
    return false;
  }
}

/** Removes every UI preference owned by the configured application namespace. */
export function clearPreferences(): boolean {
  try {
    const prefix = preferenceKey('');
    const ownedKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) ownedKeys.push(key);
    }
    for (const key of ownedKeys) window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
