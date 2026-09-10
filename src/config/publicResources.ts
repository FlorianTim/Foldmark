import { appConfig } from '@/config';

/** Public documentation destinations generated from the application slug. */
export interface PublicResourceLinks {
  readonly website: string;
  readonly support: string;
  readonly faq: string;
  readonly privacy: string;
  readonly dataDeletion: string;
  readonly changelog: string;
  readonly licenses: string;
}

/** Supported shared LumbreCode contact channels. */
export type ContactRole = keyof typeof appConfig.organization.contactLocalParts;

const resourceBase = new URL(`apps/${appConfig.slug}/`, `${appConfig.organization.url}/`);

/** Stable HTTPS links to the public app documentation. */
export const publicResourceLinks: PublicResourceLinks = {
  website: resourceBase.href,
  support: new URL('support/', resourceBase).href,
  faq: new URL('faq/', resourceBase).href,
  privacy: new URL('privacy/', resourceBase).href,
  dataDeletion: new URL('data-deletion/', resourceBase).href,
  changelog: new URL('changelog/', resourceBase).href,
  licenses: new URL('licenses/', resourceBase).href,
};

function decodeLocalPart(role: ContactRole): string {
  const decoded = globalThis.atob(appConfig.organization.contactLocalParts[role]);
  if (!/^[a-z0-9._+-]+$/.test(decoded)) {
    throw new Error('Configured contact local part is invalid.');
  }
  return decoded;
}

/**
 * Creates an obfuscated shared-mailbox link with an application-specific subject.
 *
 * The reversible transform only discourages trivial source scraping; it is not encryption.
 */
export function createContactHref(role: ContactRole, subject: string): string {
  const address = `${decodeLocalPart(role)}@${appConfig.organization.domain}`;
  return `mailto:${address}?subject=${encodeURIComponent(`[${appConfig.shortName}] ${subject}`)}`;
}
