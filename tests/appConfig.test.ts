import { describe, expect, it } from 'vitest';
import { appConfig } from '@/config';
import { AppConfigSchema } from '@/config/AppConfig';

describe('app config', () => {
  it('is valid and branded for LumbreCode', () => {
    expect(appConfig.organization.name).toBe('LumbreCode');
    expect(appConfig.customDomain).toBe('foldmark.webapps.lumbrecode.de');
    expect(appConfig.supportedLocales).toEqual(expect.arrayContaining(['de', 'en']));
  });

  it('rejects a non-HTTPS organization URL', () => {
    expect(() =>
      AppConfigSchema.parse({
        ...appConfig,
        organization: { ...appConfig.organization, url: 'javascript:alert(1)' },
      }),
    ).toThrow();
  });
});
