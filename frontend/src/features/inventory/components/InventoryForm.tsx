import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
  type InventoryItemInput,
} from '@/features/inventory/types/schemas'
import type { InventoryRow, Tables } from '@/types/database'

const EMPTY: InventoryItemFormValues = {
  name: '',
  unit: 'kg',
  quantity: 0,
  min_quantity: 0,
  supplier_id: '',
}

interface InventoryFormProps {
  editing: InventoryRow | null
  suppliers: Tables<'suppliers'>[]
  submitting: boolean
  onSubmit: (values: InventoryItemInput) => Promise<void>
  onCancel: () => void
}

export function InventoryForm({ editing, suppliers, submitting, onSubmit, onCancel }: InventoryFormProps) {
  const form = useForm<InventoryItemFormValues, unknown, InventoryItemInput>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: EMPTY,
  })
  const { errors } = form.formState

  useEffect(() => {
    form.reset(
      editing
        ? {
            name: editing.ingredients?.name ?? '',
            unit: editing.ingredients?.unit ?? 'unit',
            quantity: Number(editing.quantity),
            min_quantity: Number(editing.min_quantity),
            supplier_id: editing.supplier_id ?? '',
          }
        : EMPTY,
    )
  }, [editing, form])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? `Edit ${editing.ingredients?.name ?? 'item'}` : 'New inventory item'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <Field label="Name" htmlFor="inv-name" error={errors.name?.message} className="lg:col-span-2">
            <Input id="inv-name" autoFocus placeholder="e.g. Olive oil" {...form.register('name')} />
          </Field>
          <Field label="Unit" htmlFor="inv-unit" error={errors.unit?.message}>
            <Input id="inv-unit" placeholder="kg, L, portion" {...form.register('unit')} />
          </Field>
          <Field label="In stock" htmlFor="inv-quantity" error={errors.quantity?.message}>
            <Input id="inv-quantity" type="number" step="0.001" min={0} inputMode="decimal" {...form.register('quantity')} />
          </Field>
          <Field label="Reorder at" htmlFor="inv-min-quantity" error={errors.min_quantity?.message}>
            <Input id="inv-min-quantity" type="number" step="0.001" min={0} inputMode="decimal" {...form.register('min_quantity')} />
          </Field>
          <Field label="Supplier" htmlFor="inv-supplier" className="lg:col-span-2">
            <Select id="inv-supplier" {...form.register('supplier_id')}>
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-2 block">
        {label}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
