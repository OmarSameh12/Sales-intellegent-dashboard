import { Package, ShoppingCart, Users, Wallet } from 'lucide-react'
import { fetchOverview, fetchTrends, fetchRecentOrders } from '@/services/api'
import { useApi } from '@/hooks/useApi'
import { ErrorState } from '@/components/error-state'
import { fmtCurrency, fmtNumber } from '@/lib/insights'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

const chartConfig = { revenue: { label: 'Revenue', color: 'var(--chart-1)' } }

export function OverviewPage() {
  const { data, loading, error, retry } = useApi(() =>
    Promise.all([fetchOverview(), fetchTrends(), fetchRecentOrders(8)]).then(
      ([overview, trends, recent]) => ({ overview, trends, recent }),
    ),
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={error} onRetry={retry} />
  }

  const { overview, trends, recent } = data

  const cards = [
    { title: 'Revenue', value: fmtCurrency(overview.revenue), icon: Wallet },
    { title: 'Orders', value: fmtNumber(overview.orders), icon: ShoppingCart },
    { title: 'Customers', value: fmtNumber(overview.customers), icon: Users },
    { title: 'Avg. Order Value', value: fmtCurrency(overview.aov), icon: Package },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Sales trend</CardTitle>
            <CardDescription>Daily revenue across the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
              <AreaChart data={trends} margin={{ left: 12, right: 12 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Latest orders across the store.</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.order_id}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell className="text-right font-mono">{fmtCurrency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}