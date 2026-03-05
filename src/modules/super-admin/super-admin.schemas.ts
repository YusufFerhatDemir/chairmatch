import { z } from 'zod'

export const settingSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
})

export const saveSettingsSchema = z.object({
  category: z.string().min(1),
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string(),
  })),
})

export const slideSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().min(1).max(500),
  imageUrl: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const reorderSlidesSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
})

export type SaveSettingsInput = z.infer<typeof saveSettingsSchema>
export type SlideInput = z.infer<typeof slideSchema>
