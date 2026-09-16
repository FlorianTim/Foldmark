import type { SettingsStore } from '@/application/ports/SettingsStore';
import {
  allSettings,
  rawValue,
  resetAllSettings,
  type SettingDescriptor,
} from '@/presentation/settings/settingsRegistry';
import { writePreference } from '@/presentation/browserStorage';

/**
 * The settings registry, seen as a key/value store the backup can carry.
 *
 * Restore is **allow-listed**: only keys the registry declares are written
 * back. A backup file is user-supplied data, and a restore that wrote whatever
 * keys the file contained would let one file seed arbitrary entries into this
 * origin's local storage. Unknown keys are counted as skipped, not rejected —
 * a backup from a newer Foldmark should still restore everything this version
 * understands.
 *
 * Values are not decoded on the way in either. Each setting's own `decode`
 * already degrades an unusable value to its default on the next read, so a
 * corrupted entry costs one preference rather than the whole restore.
 */
export class RegistrySettingsStore implements SettingsStore {
  /** Every stored preference, in its stored form. */
  public snapshot(): Readonly<Record<string, string>> {
    const values: Record<string, string> = {};
    for (const setting of allSettings) {
      const value = rawValue(setting);
      if (value !== null) values[setting.key] = value;
    }
    return values;
  }

  /** Writes back the preferences the registry knows, returning how many were applied. */
  public restore(values: Readonly<Record<string, string>>): number {
    const known = new Map(allSettings.map((setting: SettingDescriptor) => [setting.key, setting]));
    let applied = 0;
    for (const [key, value] of Object.entries(values)) {
      if (!known.has(key) || typeof value !== 'string') continue;
      if (writePreference(key, value)) applied += 1;
    }
    return applied;
  }

  /** Removes every preference this application owns. */
  public clear(): void {
    resetAllSettings();
  }
}
