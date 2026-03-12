import { z } from 'zod'

/** Passwort-Policy: min 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen */
const passwordSchema = z
  .string()
  .min(10, 'Mindestens 10 Zeichen')
  .regex(/[A-Z]/, 'Mindestens 1 Großbuchstabe')
  .regex(/[0-9]/, 'Mindestens 1 Zahl')
  .regex(/[^A-Za-z0-9]/, 'Mindestens 1 Sonderzeichen')

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
})

export const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: passwordSchema,
  fullName: z.string().min(2, 'Mindestens 2 Zeichen').max(100),
  phone: z.string().optional(),
  agbAccepted: z.literal(true, { message: 'AGB müssen akzeptiert werden' }),
  datenschutzAccepted: z.literal(true, { message: 'Datenschutz muss akzeptiert werden' }),
  marketingAccepted: z.boolean().optional().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
