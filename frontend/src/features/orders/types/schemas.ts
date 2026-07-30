import { z } from 'zod'

export const orderMetaSchema = z.object({
  table_id: z.string().optional(),
  notes: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(5),
})

export const createOrderSchema = orderMetaSchema.extend({
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.coerce.number().int().min(1),
      }),
    )
    .min(1, 'Add at least one item'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type OrderMetaInput = z.infer<typeof orderMetaSchema>

export const ORDER_TRANSITIONS: Record<
  import('@/types/database').OrderStatus,
  import('@/types/database').OrderStatus[]
> = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
