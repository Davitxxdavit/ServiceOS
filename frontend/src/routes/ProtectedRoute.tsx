import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
