import { supabase } from '@/lib/supabase'
import type { LoginInput, SignupInput } from '@/features/auth/types/schemas'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

export async function signIn({ email, password }: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(input: SignupInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  })
  if (error) throw error
  if (!data.user) throw new Error('Signup failed')

  // Bootstrap restaurant + owner employee when session is available (email confirm may delay)
  if (data.session) {
    await bootstrapRestaurant(data.user.id, input.restaurantName, input.email)
  }

  return data
}

export async function bootstrapRestaurant(userId: string, restaurantName: string, email: string) {
  const slugBase = slugify(restaurantName) || 'restaurant'
  const slug = `${slugBase}-${userId.slice(0, 8)}`

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: restaurantName,
      slug,
      email,
    })
    .select()
    .single()

  if (restaurantError) throw restaurantError

  const { data: ownerRole, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('slug', 'owner')
    .single()

  if (roleError) throw roleError

  const { error: employeeError } = await supabase.from('employees').insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    role_id: ownerRole.id,
    is_active: true,
    hired_at: new Date().toISOString().slice(0, 10),
  })

  if (employeeError) throw employeeError
  return restaurant
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function loadRestaurantContext(userId: string) {
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!employee) {
    return { restaurant: null, employee: null, roleSlug: null, permissions: [] as string[] }
  }

  const [{ data: restaurant }, { data: role }, { data: rolePerms }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', employee.restaurant_id).single(),
    supabase.from('roles').select('*').eq('id', employee.role_id).single(),
    supabase
      .from('role_permissions')
      .select('permission_id, permissions(key)')
      .eq('role_id', employee.role_id),
  ])

  const permissions =
    rolePerms?.flatMap((rp) => {
      const perm = rp.permissions as unknown as { key: string } | { key: string }[] | null
      if (!perm) return []
      if (Array.isArray(perm)) return perm.map((p) => p.key)
      return [perm.key]
    }) ?? []

  return {
    restaurant: restaurant ?? null,
    employee,
    roleSlug: role?.slug ?? null,
    permissions,
  }
}

export async function loadProfile(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}
