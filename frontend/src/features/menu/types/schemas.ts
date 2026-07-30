import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
})

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  price: z.coerce.number().min(0, 'Price must be >= 0'),
  preparation_time_minutes: z.coerce.number().int().min(0),
  is_available: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
  image_url: z.string().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type MenuItemInput = z.infer<typeof menuItemSchema>
