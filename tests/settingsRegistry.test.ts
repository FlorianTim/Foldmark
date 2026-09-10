import { beforeEach, describe, expect, it } from 'vitest';
import {
  allSettings,
  appSettings,
  rawValue,
  readSetting,
  resetAllSettings,
  writeSetting,
} from '@/presentation/settings/settingsRegistry';

beforeEach(() => {
  window.localStorage.clear();
});

describe('settings registry', () => {
  it('lists every registered setting exactly once', () => {
    const registered = Object.keys(appSettings).length;
    expect(allSettings).toHaveLength(registered);
    const keys = allSettings.map((setting) => setting.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names the default of every setting in stored form', () => {
    for (const setting of allSettings) {
      expect(typeof setting.encodedDefault).toBe('string');
    }
  });
});

describe('degradation', () => {
  it('falls back to the default when nothing is stored', () => {
    expect(readSetting(appSettings.theme)).toBe('system');
    expect(readSetting(appSettings.locale)).toBe('de');
    expect(readSetting(appSettings.entitlement)).toBe('free');
    expect(readSetting(appSettings.introCompleted)).toBe(false);
  });

  it('falls back to the default for an unusable stored value', () => {
    // A preference must never be able to stop the app from rendering.
    for (const raw of ['', 'nonsense', 'DARK', '1']) {
      writeSetting(appSettings.theme, raw as never);
      expect(readSetting(appSettings.theme)).toBe(raw === '' ? 'system' : 'system');
    }
    writeSetting(appSettings.entitlement, 'pro' as never);
    expect(readSetting(appSettings.entitlement)).toBe('free');
  });

  it('round-trips every valid entitlement by its stable string', () => {
    for (const value of ['free', 'pro-lifetime', 'pro-subscription'] as const) {
      writeSetting(appSettings.entitlement, value);
      expect(readSetting(appSettings.entitlement)).toBe(value);
    }
  });

  it('keeps the timestamp in UTC and rejects an unparseable one', () => {
    writeSetting(appSettings.entitlementCheckedAt, '2026-08-26T12:00:00.000Z');
    expect(readSetting(appSettings.entitlementCheckedAt)).toBe('2026-08-26T12:00:00.000Z');

    writeSetting(appSettings.entitlementCheckedAt, 'yesterday');
    expect(readSetting(appSettings.entitlementCheckedAt)).toBe('');
  });
});

describe('the intro flag', () => {
  it('accepts the value the earlier privacy notice wrote', () => {
    // Visitors who already accepted must not be shown the intro again just
    // because it grew extra steps.
    window.localStorage.setItem('web-app-template:ui:privacy-notice-v1', 'accepted');
    expect(readSetting(appSettings.introCompleted)).toBe(true);
  });

  it('degrades to showing the intro for anything unreadable', () => {
    for (const raw of ['yes', 'TRUE', '1', '']) {
      window.localStorage.setItem('web-app-template:ui:privacy-notice-v1', raw);
      expect(readSetting(appSettings.introCompleted)).toBe(false);
    }
  });
});

describe('resetAllSettings', () => {
  it('removes every registered key', () => {
    writeSetting(appSettings.theme, 'dark');
    writeSetting(appSettings.locale, 'en');
    writeSetting(appSettings.introCompleted, true);

    expect(resetAllSettings()).toBe(true);

    for (const setting of allSettings) {
      expect(rawValue(setting)).toBeNull();
    }
    expect(readSetting(appSettings.theme)).toBe('system');
  });

  it('leaves keys outside the registry alone', () => {
    // Content lives elsewhere; a stray key proves the reset is scoped to the
    // registry rather than clearing storage.
    window.localStorage.setItem('unrelated', 'keep me');
    writeSetting(appSettings.theme, 'dark');

    resetAllSettings();

    expect(window.localStorage.getItem('unrelated')).toBe('keep me');
  });
});
