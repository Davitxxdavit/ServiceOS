import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Tables<'users'> | null
  restaurant: Tables<'restaurants'> | null
  employee: Tables<'employees'> | null
  roleSlug: string | null
  permissions: string[]
  initialized: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Tables<'users'> | null) => void
  setRestaurantContext: (payload: {
    restaurant: Tables<'restaurants'> | null
    employee: Tables<'employees'> | null
    roleSlug: string | null
    permissions: string[]
  }) => void
  setInitialized: (value: boolean) => void
  hasPermission: (key: string) => boolean
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  restaurant: null,
  employee: null,
  roleSlug: null,
  permissions: [],
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setRestaurantContext: ({ restaurant, employee, roleSlug, permissions }) =>
    set({ restaurant, employee, roleSlug, permissions }),
  setInitialized: (initialized) => set({ initialized }),
  hasPermission: (key) => {
    const perms = get().permissions
    return perms.includes('*') || perms.includes(key)
  },
  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      restaurant: null,
      employee: null,
      roleSlug: null,
      permissions: [],
    }),
}))
