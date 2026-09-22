import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  Sparkles,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { signOut } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/kitchen', label: 'Kitchen', icon: CookingPot },
  { to: '/tables', label: 'Tables', icon: Grid3X3 },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
] as const

const comingSoonNav = [
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
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close the mobile drawer on navigation and on Escape
  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move focus into the modal drawer, and hand it back to the trigger on close
    const opener = openButtonRef.current
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      opener?.focus()
    }
  }, [mobileOpen])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign out failed')
    }
  }

  const sidebarProps = {
    restaurantName: restaurant?.name,
    profileName: profile?.full_name,
    roleSlug,
    theme,
    onToggleTheme: toggleTheme,
    onSignOut: () => void handleSignOut(),
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen flex-col border-r border-border/80 bg-card/40 backdrop-blur-xl transition-all md:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <SidebarContent
          {...sidebarProps}
          collapsed={collapsed}
          headerAction={
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          }
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl"
          >
            <SidebarContent
              {...sidebarProps}
              collapsed={false}
              headerAction={
                <Button
                  ref={closeButtonRef}
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          </motion.aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              ref={openButtonRef}
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Workspace</div>
              <div className="truncate font-semibold tracking-tight">{restaurant?.name ?? APP_NAME}</div>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 capitalize">
            {roleSlug ?? 'member'}
          </Badge>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  collapsed: boolean
  headerAction: ReactNode
  restaurantName?: string
  profileName?: string | null
  roleSlug: string | null
  theme: string
  onToggleTheme: () => void
  onSignOut: () => void
}

function SidebarContent({
  collapsed,
  headerAction,
  restaurantName,
  profileName,
  roleSlug,
  theme,
  onToggleTheme,
  onSignOut,
}: SidebarContentProps) {
  return (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border/60 px-4">
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight">{APP_NAME}</div>
            <div className="truncate text-xs text-muted-foreground">{restaurantName ?? 'No restaurant'}</div>
          </div>
        ) : (
          <div className="mx-auto text-sm font-bold text-primary">SO</div>
        )}
        {headerAction}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {primaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            title={collapsed ? item.label : undefined}
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
            <div className="truncate text-sm font-medium">{profileName ?? 'User'}</div>
            <div className="truncate text-xs capitalize text-muted-foreground">{roleSlug ?? 'member'}</div>
          </div>
        ) : null}
        <div className={cn('flex gap-1', collapsed && 'flex-col')}>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  )
}
