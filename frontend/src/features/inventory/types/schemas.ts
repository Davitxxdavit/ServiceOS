import { z } from 'zod'

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  unit: z.string().trim().min(1, 'Unit is required').max(24),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  min_quantity: z.coerce.number().min(0, 'Minimum cannot be negative'),
  supplier_id: z
    .string()
    .uuid()
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
})

export type InventoryItemFormValues = z.input<typeof inventoryItemSchema>
export type InventoryItemInput = z.output<typeof inventoryItemSchema>
