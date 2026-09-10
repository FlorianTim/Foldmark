import { z } from 'zod';

// This expression is linear and configuration strings are bounded below.
// eslint-disable-next-line security/detect-unsafe-regex
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HttpsUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => new URL(value).protocol === 'https:', 'URL must use HTTPS.');

const EncodedContactSchema = z
  .string()
  .regex(/^[A-Za-z0-9+/]+={0,2}$/)
  .max(128);

/** Runtime schema for the public, build-time application configuration. */
export const AppConfigSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    shortName: z.string().trim().min(1).max(40),
    slug: z.string().max(100).regex(SLUG_PATTERN),
    description: z.string().trim().min(1).max(200),
    packageName: z.string().trim().min(1).max(214),
    version: z.string().trim().min(1).max(50),
    defaultLocale: z.enum(['de', 'en']),
    supportedLocales: z
      .array(z.enum(['de', 'en']))
      .min(2)
      .max(2),
    repositoryOwner: z.string().trim().min(1).max(100),
    repositoryName: z.string().trim().min(1).max(100),
    githubPagesBase: z.string().trim().min(1).max(200),
    customDomain: z.string().trim().max(253),
    theme: z.enum(['system', 'light', 'dark', 'paper', 'sepia', 'high-contrast', 'ocean']),
    license: z.string().trim().min(1).max(100),
    organization: z
      .object({
        name: z.string().trim().min(1).max(100),
        domain: z.string().trim().min(1).max(253),
        url: HttpsUrlSchema,
        webAppsDomain: z.string().trim().min(1).max(253),
        contactLocalParts: z
          .object({
            contact: EncodedContactSchema,
            support: EncodedContactSchema,
            feedback: EncodedContactSchema,
            bugs: EncodedContactSchema,
            privacy: EncodedContactSchema,
            security: EncodedContactSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .refine(
    ({ supportedLocales }) => supportedLocales.includes('de') && supportedLocales.includes('en'),
    'Both German and English must be supported.',
  );

/** Validated public configuration available to browser code. */
export type AppConfig = z.infer<typeof AppConfigSchema>;
