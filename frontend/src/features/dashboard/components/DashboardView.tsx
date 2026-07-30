import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CalendarDays, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard'

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint: string
  icon: typeof Wallet
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const restaurant = useAuthStore((s) => s.restaurant)
  const { data, isLoading } = useDashboard()

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today at {restaurant?.name ?? 'your restaurant'} — live operations snapshot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's revenue"
          value={formatCurrency(data.todayRevenue)}
          hint="From completed & delivered orders"
          icon={Wallet}
        />
        <StatCard
          title="Today's orders"
          value={String(data.todayOrders)}
          hint="All statuses since midnight"
          icon={ShoppingBag}
        />
        <StatCard
          title="Average order"
          value={formatCurrency(data.averageOrder)}
          hint="Completed / delivered only"
          icon={TrendingUp}
        />
        <StatCard
          title="Reservations"
          value={`${data.reservationSummary.today} today`}
          hint={`${data.reservationSummary.upcoming} upcoming from now`}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by hour</CardTitle>
            <CardDescription>Last 24 hours · completed & delivered</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top selling items</CardTitle>
            <CardDescription>Today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topItems.length ? (
              data.topItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span>{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.quantity}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sales yet today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium">{a.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {JSON.stringify(a.metadata)}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <div>
              <CardTitle>Low stock alerts</CardTitle>
              <CardDescription>Inventory at or below minimum</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStock.length ? (
              data.lowStock.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <Badge variant="warning">
                    {item.quantity} / min {item.min_quantity}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Stock levels look healthy.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
