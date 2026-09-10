import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '@/config';
import {
  clearPreferences,
  preferenceKey,
  readPreference,
  writePreference,
} from '@/presentation/browserStorage';

describe('browser preferences', () => {
  afterEach(() => vi.restoreAllMocks());

  it('namespaces keys with the application slug', () => {
    expect(preferenceKey('theme')).toBe(`${appConfig.slug}:ui:theme`);
  });

  it('degrades safely when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    expect(readPreference('theme')).toBeNull();
    expect(writePreference('theme', 'dark')).toBe(false);
  });

  it('deletes only preferences owned by this app', () => {
    localStorage.setItem(preferenceKey('theme'), 'dark');
    localStorage.setItem('another-app:ui:theme', 'light');
    expect(clearPreferences()).toBe(true);
    expect(localStorage.getItem(preferenceKey('theme'))).toBeNull();
    expect(localStorage.getItem('another-app:ui:theme')).toBe('light');
    localStorage.clear();
  });
});
