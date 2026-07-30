import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { loadProfile, loadRestaurantContext } from '@/features/auth/services/auth-service'

export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setRestaurantContext = useAuthStore((s) => s.setRestaurantContext)
  const setInitialized = useAuthStore((s) => s.setInitialized)
  const reset = useAuthStore((s) => s.reset)

  useEffect(() => {
    let mounted = true

    async function hydrate(sessionUserId: string | undefined) {
      if (!sessionUserId) {
        reset()
        setInitialized(true)
        return
      }
      try {
        const [profile, context] = await Promise.all([
          loadProfile(sessionUserId),
          loadRestaurantContext(sessionUserId),
        ])
        if (!mounted) return
        setProfile(profile)
        setRestaurantContext(context)
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setInitialized(true)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void hydrate(data.session?.user.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      void hydrate(session?.user.id)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [reset, setInitialized, setProfile, setRestaurantContext, setSession])
}
