import { Outlet, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { APP_NAME } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { Skeleton } from '@/components/ui/skeleton'

export function AuthLayout() {
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }

  if (session) return <Navigate to="/" replace />

  return (
    <div className="relative flex min-h-screen">
      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(168_70%_42%_/_0.25),_transparent_55%),linear-gradient(160deg,_hsl(222_28%_8%),_hsl(222_24%_12%))]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-foreground">
          <div className="text-2xl font-bold tracking-tight">{APP_NAME}</div>
          <div>
            <p className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
              Restaurant operations, without the noise.
            </p>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Orders, kitchen, floor, and menu in one enterprise-grade workspace built for real service
              teams.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Phase 1 · Portfolio-ready SaaS</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl border border-border/70 bg-card/70 p-8 shadow-xl backdrop-blur-xl"
        >
          <div className="mb-8 text-xl font-bold tracking-tight lg:hidden">{APP_NAME}</div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
