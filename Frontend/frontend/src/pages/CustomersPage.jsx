import { useMemo, useState } from 'react'
import { Download, Search, ShoppingCart, Users, Wallet } from 'lucide-react'
import { fetchCustomers } from '@/services/api'
import { useApi } from '@/hooks/useApi'
import { ErrorState } from '@/components/error-state'
import { fmtCurrency, fmtNumber } from '@/lib/insights'
import { downloadCsv } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Cell, Pie, PieChart } from 'recharts'

// Segmentation exactly as implemented by the backend (analytics.py):
// order_count === 1 -> "New", spending > avg -> "High Value", else "Returning".
const SEGMENTS = ['High Value', 'Returning', 'New']
const SEGMENT_COLORS = {
  'High Value': 'var(--chart-1)',
  Returning: 'var(--chart-2)',
  New: 'var(--chart-3)',
}

const segmentConfig = SEGMENTS.reduce((acc, name) => {
  acc[name] = { label: name, color: SEGMENT_COLORS[name] }
  return acc
}, {})

const badgeVariant = {
  'High Value': 'default',
  Returning: 'secondary',
  New: 'outline',
}

function renderSegment({ name }) {
  return (
    <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600}>
      {name}
    </text>
  )
}

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const [segMetric, setSegMetric] = useState('customers')
  const { data, loading, error, retry } = useApi(() => fetchCustomers())

  // Behaviour aggregates per backend segment — customer counts or revenue share.
  const segmentData = useMemo(() => {
    if (!data) return []
    return SEGMENTS.map((seg) => {
      const members = data.list.filter((c) => c.segment === seg)
      return {
        name: seg,
        value:
          segMetric === 'revenue'
            ? Number(members.reduce((s, c) => s + c.total, 0).toFixed(2))
            : members.length,
      }
    })
  }, [data, segMetric])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.list
    return data.list.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(q) ||
        c.customer_id.toLowerCase().includes(q),
    )
  }, [query, data])

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
  const { list, totalCustomers, repeatCustomers, repeatRate, oneTimeCustomers } = data

  // Derived from the same payload analytics.py returns per customer.
  const totalSpent = list.reduce((s, c) => s + c.total, 0)
  const totalOrders = list.reduce((s, c) => s + c.orderCount, 0)

  const stats = [
    { title: 'Total customers', value: fmtNumber(totalCustomers), icon: Users },
    { title: 'Repeat customers', value: fmtNumber(repeatCustomers), icon: Users },
    { title: 'Repeat rate', value: `${repeatRate}%`, icon: Users },
    { title: 'One-time buyers', value: fmtNumber(oneTimeCustomers), icon: Users },
    {
      title: 'Avg spending',
      value: fmtCurrency(totalCustomers ? totalSpent / totalCustomers : 0),
      icon: Wallet,
    },
    {
      title: 'Avg orders',
      value: fmtNumber(Number(totalCustomers ? (totalOrders / totalCustomers).toFixed(1) : 0)),
      icon: ShoppingCart,
    },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Segment distribution</CardTitle>
              <CardDescription>
                {segMetric === 'revenue'
                  ? 'Revenue contributed per behaviour segment.'
                  : 'Customers grouped by purchase behaviour.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {['customers', 'revenue'].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={segMetric === m ? 'secondary' : 'outline'}
                  onClick={() => setSegMetric(m)}
                >
                  {m === 'revenue' ? 'Revenue' : 'Count'}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
            <ChartContainer config={segmentConfig} className="aspect-square w-full max-w-xs">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={segmentData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  label={renderSegment}
                  labelLine={false}
                >
                  {segmentData.map((seg) => (
                    <Cell key={seg.name} fill={SEGMENT_COLORS[seg.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid w-full gap-1">
              {segmentData.map((seg) => (
                <div key={seg.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: SEGMENT_COLORS[seg.name] }}
                  />
                  <span className="text-muted-foreground">{seg.name}</span>
                  <span className="ml-auto font-medium">
                    {segMetric === 'revenue'
                      ? fmtCurrency(seg.value)
                      : fmtNumber(seg.value)}
                  </span>
                </div>
              ))}
                        </div>
          </CardContent>
        </Card>


        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top customers</CardTitle>
              <CardDescription>Ranked by total spend.</CardDescription>
            </div>
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers…"
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Last purchase</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead className="text-right">Avg / order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.customer_name}</p>
                        <p className="text-muted-foreground text-sm">{customer.customer_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant[customer.segment] ?? 'outline'}>
                        {customer.segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtNumber(customer.orderCount)}</TableCell>
                    <TableCell className="text-right">{customer.lastPurchase ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmtCurrency(customer.total)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtCurrency(customer.orderCount ? customer.total / customer.orderCount : 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                      No customers match "{query}".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              filtered.map((c) => ({
                customer_id: c.customer_id,
                customer_name: c.customer_name,
                segment: c.segment,
                orders: c.orderCount,
                spending: c.total,
                avg_per_order: c.orderCount ? Number((c.total / c.orderCount).toFixed(2)) : 0,
                last_purchase: c.lastPurchase,
              })),
              'customers.csv',
            )
          }
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </div>
  )
}

