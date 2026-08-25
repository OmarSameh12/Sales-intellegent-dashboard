import { useState } from 'react'
import { Download } from 'lucide-react'
import { fetchTrends } from '@/services/api'
import { useApi } from '@/hooks/useApi'
import { ErrorState } from '@/components/error-state'
import { fmtCurrency } from '@/lib/insights'
import { downloadCsv } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

const METRICS = ['Revenue', 'Orders', 'AOV']

const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  orders: { label: 'Orders', color: 'var(--chart-2)' },
  aov: { label: 'Avg. Order Value', color: 'var(--chart-3)' },
}

// Daily trend exactly as provided by GET /api/dashboard (sales_trend).
export function TrendsPage() {
  const [metric, setMetric] = useState('revenue')
  const { data: trendsResult, loading, error, retry } = useApi(() => fetchTrends())
  const data = trendsResult ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Daily aggregation, as provided by the backend.
        </p>
        <div className="flex items-center gap-2">
          {METRICS.map((m) => (
            <Button
              key={m}
              variant={metric === m.toLowerCase() ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMetric(m.toLowerCase())}
            >
              {m}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                data.map((d) => ({
                  date: d.date,
                  revenue: d.revenue,
                  orders: d.orders,
                  avg_order_value: d.aov,
                })),
                'sales-trends.csv',
              )
            }
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {metric === 'aov'
              ? 'Average order value over time'
              : metric === 'orders'
                ? 'Orders over time'
                : 'Revenue over time'}
          </CardTitle>
          <CardDescription>Daily totals across the uploaded period.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
              {metric === 'aov' ? (
                <LineChart data={data} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                  <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="aov" type="natural" stroke="var(--color-aov)" strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <AreaChart data={data} margin={{ left: 0, right: 12 }}>
                  <defs>
                    <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.7} />
                      <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                  <YAxis tickLine={false} axisLine={false} width={metric === 'revenue' ? 64 : 40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey={metric}
                    type="natural"
                    fill={`url(#fill-${metric})`}
                    stroke={`var(--color-${metric})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <Stat label="Days covered" value={String(data.length)} />
          <Stat label="Peak revenue" value={fmtCurrency(Math.max(0, ...data.map((d) => d.revenue)))} />
          <Stat label="Peak orders" value={String(Math.max(0, ...data.map((d) => d.orders)))} />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
