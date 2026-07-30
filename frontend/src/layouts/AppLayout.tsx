import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ClipboardList,
  CookingPot,
  Grid3X3,
  UtensilsCrossed,
  Package,
  Users,
  UserCog,
  ChartColumn,
  CalendarDays,
  Settings,
  Bell,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { signOut } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/kitchen', label: 'Kitchen', icon: CookingPot },
  { to: '/tables', label: 'Tables', icon: Grid3X3 },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
] as const

const comingSoonNav = [
  { label: 'Inventory', icon: Package },
  { label: 'Customers', icon: Users },
  { label: 'Employees', icon: UserCog },
  { label: 'Analytics', icon: ChartColumn },
  { label: 'Reservations', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
  { label: 'Notifications', icon: Bell },
] as const

export function AppLayout() {
  const navigate = useNavigate()
  const restaurant = useAuthStore((s) => s.restaurant)
  const profile = useAuthStore((s) => s.profile)
  const roleSlug = useAuthStore((s) => s.roleSlug)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed)

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign out failed')
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-border/80 bg-card/40 backdrop-blur-xl transition-all',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border/60 px-4">
          {!collapsed ? (
            <div>
              <div className="text-lg font-bold tracking-tight">{APP_NAME}</div>
              <div className="truncate text-xs text-muted-foreground">
                {restaurant?.name ?? 'No restaurant'}
              </div>
            </div>
          ) : (
            <div className="mx-auto text-sm font-bold text-primary">SO</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-primary/10 text-primary',
                  collapsed && 'justify-center px-2',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          ))}

          <div className={cn('px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70', collapsed && 'text-center px-0')}>
            {!collapsed ? 'Coming soon' : '···'}
          </div>
          {comingSoonNav.map((item) => (
            <div
              key={item.label}
              className={cn(
                'flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50',
                collapsed && 'justify-center px-2',
              )}
              title="Coming in a later phase"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Soon
                  </Badge>
                </>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="border-t border-border/60 p-3">
          {!collapsed ? (
            <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2">
              <div className="truncate text-sm font-medium">{profile?.full_name ?? 'User'}</div>
              <div className="truncate text-xs capitalize text-muted-foreground">{roleSlug ?? 'member'}</div>
            </div>
          ) : null}
          <div className={cn('flex gap-1', collapsed && 'flex-col')}>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void handleSignOut()} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
          <div>
            <div className="text-sm text-muted-foreground">Workspace</div>
            <div className="font-semibold tracking-tight">{restaurant?.name ?? APP_NAME}</div>
          </div>
          <Badge variant="outline" className="capitalize">
            {roleSlug ?? 'member'}
          </Badge>
        </header>
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
