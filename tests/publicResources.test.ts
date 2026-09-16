import { describe, expect, it } from 'vitest';
import { createContactHref, publicResourceLinks } from '@/config/publicResources';

describe('public resources', () => {
  it('derives canonical documentation URLs from the configured slug', () => {
    expect(publicResourceLinks.privacy).toBe('https://lumbrecode.de/apps/foldmark/privacy/');
    expect(publicResourceLinks.dataDeletion.endsWith('/data-deletion/')).toBe(true);
  });

  it('reconstructs shared mailboxes only when a contact link is requested', () => {
    expect(createContactHref('support', 'Support request')).toBe(
      'mailto:support@lumbrecode.de?subject=%5BFoldmark%5D%20Support%20request',
    );
  });
});
