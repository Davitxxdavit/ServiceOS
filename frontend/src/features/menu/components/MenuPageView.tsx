import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, UtensilsCrossed, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useCategories, useMenuItems, useMenuMutations } from '@/features/menu/hooks/use-menu'
import { categorySchema, menuItemSchema, type CategoryInput, type MenuItemInput } from '@/features/menu/types/schemas'
import type { MenuItemWithCategory } from '@/types/database'

type MenuItemRow = MenuItemWithCategory

export function MenuPageView() {
  const canWrite = useAuthStore((s) => s.hasPermission('menu:write') || s.hasPermission('*'))
  const { data: categories, isLoading: loadingCats } = useCategories()
  const { data: items, isLoading: loadingItems } = useMenuItems()
  const mutations = useMenuMutations()
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemRow | null>(null)

  const itemForm = useForm<MenuItemInput>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      preparation_time_minutes: 15,
      is_available: true,
      sort_order: 0,
      category_id: null,
      image_url: '',
    },
  })

  const categoryForm = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', sort_order: 0, is_active: true },
  })

  function openEdit(item: MenuItemRow) {
    setEditingItem(item)
    itemForm.reset({
      name: item.name,
      description: item.description ?? '',
      price: Number(item.price),
      preparation_time_minutes: item.preparation_time_minutes,
      is_available: item.is_available,
      sort_order: item.sort_order,
      category_id: item.category_id,
      image_url: item.image_url ?? '',
    })
    setShowItemForm(true)
  }

  async function onSaveItem(values: MenuItemInput) {
    try {
      if (editingItem) {
        await mutations.updateItem.mutateAsync({ id: editingItem.id, input: values })
        toast.success('Item updated')
      } else {
        await mutations.createItem.mutateAsync(values)
        toast.success('Item created')
      }
      setShowItemForm(false)
      setEditingItem(null)
      itemForm.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    }
  }

  async function onSaveCategory(values: CategoryInput) {
    try {
      await mutations.createCategory.mutateAsync(values)
      toast.success('Category created')
      setShowCategoryForm(false)
      categoryForm.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return
    try {
      const url = await mutations.uploadImage.mutateAsync(file)
      itemForm.setValue('image_url', url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  if (loadingCats || loadingItems) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">Categories, pricing, availability, and prep times.</p>
        </div>
        {canWrite ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCategoryForm(true)}>
              <Plus className="h-4 w-4" /> Category
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null)
                itemForm.reset()
                setShowItemForm(true)
              }}
            >
              <Plus className="h-4 w-4" /> Item
            </Button>
          </div>
        ) : null}
      </div>

      {showCategoryForm ? (
        <Card>
          <CardHeader>
            <CardTitle>New category</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={categoryForm.handleSubmit(onSaveCategory)}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...categoryForm.register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" {...categoryForm.register('sort_order')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea {...categoryForm.register('description')} />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCategoryForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showItemForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit item' : 'New item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={itemForm.handleSubmit(onSaveItem)}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...itemForm.register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select {...itemForm.register('category_id')}>
                  <option value="">Uncategorized</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" {...itemForm.register('price')} />
              </div>
              <div className="space-y-2">
                <Label>Prep time (min)</Label>
                <Input type="number" {...itemForm.register('preparation_time_minutes')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea {...itemForm.register('description')} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onUpload(e.target.files?.[0])}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input id="available" type="checkbox" {...itemForm.register('is_available')} />
                <Label htmlFor="available">Available</Label>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Save item</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowItemForm(false)
                    setEditingItem(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {categories?.map((c) => (
          <Badge key={c.id} variant="secondary">
            {c.name}
          </Badge>
        ))}
      </div>

      {!items?.length ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No menu items yet"
          description="Add categories and items to start taking orders."
          actionLabel={canWrite ? 'Add item' : undefined}
          onAction={canWrite ? () => setShowItemForm(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const row = item
            return (
              <Card key={row.id} className="overflow-hidden">
                {row.image_url ? (
                  <img src={row.image_url} alt={row.name} className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-muted/40 text-muted-foreground">
                    <UtensilsCrossed className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{row.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {row.menu_categories?.name ?? 'Uncategorized'} · {row.preparation_time_minutes} min
                      </p>
                    </div>
                    <Badge variant={row.is_available ? 'success' : 'secondary'}>
                      {row.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {row.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {formatCurrency(Number(row.price))}
                    </span>
                    {canWrite ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            void mutations.deleteItem.mutateAsync(row.id).then(() => toast.success('Deleted'))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
