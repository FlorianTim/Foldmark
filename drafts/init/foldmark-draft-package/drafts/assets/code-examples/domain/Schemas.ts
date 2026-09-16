import { z } from 'zod';

const finiteMm = z.number().finite().min(-50).max(2000);

export const printMarkerSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(['fold', 'hole', 'cut', 'safe-area', 'bleed', 'separator', 'address-window', 'stamp-area', 'grid', 'custom']),
  label: z.string().max(120).optional(),
  xMm: finiteMm,
  yMm: finiteMm,
  widthMm: finiteMm.nonnegative().optional(),
  heightMm: finiteMm.nonnegative().optional(),
  preview: z.boolean().default(true),
  print: z.boolean().default(false),
});

export const emailHeaderValueSchema = z
  .string()
  .max(998)
  .refine((value) => !/[\r\n]/u.test(value), 'Header values must not contain CR or LF.');
