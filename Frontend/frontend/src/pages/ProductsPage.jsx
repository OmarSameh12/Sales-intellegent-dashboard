import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { fetchProducts } from '@/services/api'
import { useApi } from '@/hooks/useApi'
import { ErrorState } from '@/components/error-state'
import { fmtCurrency } from '@/lib/insights'
import { downloadCsv } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Cell, Pie, PieChart } from 'recharts'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const { data: result, loading, error, retry } = useApi(() => fetchProducts())
  const data = result ?? { products: [], categories: [] }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.products
    return data.products.filter((p) => p.product.toLowerCase().includes(q))
  }, [query, data.products])

  const catConfig = useMemo(() => {
    const c = {}
    data.categories.forEach((cat, i) => {
      c[cat.category] = { label: cat.category, color: COLORS[i % COLORS.length] }
    })
    return c
  }, [data.categories])

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Category share</CardTitle>
          <CardDescription>Revenue split by category.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
          <ChartContainer config={catConfig} className="aspect-square w-full max-w-xs">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={data.categories} dataKey="revenue" nameKey="category" innerRadius={48} outerRadius={80}>
                {data.categories.map((c, i) => (
                  <Cell key={c.category} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="grid w-full gap-1 sm:grid-cols-2">
            {data.categories.map((c, i) => (
              <div key={c.category} className="flex items-center gap-2 text-sm">
                <span className="size-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{c.category}</span>
                <span className="ml-auto font-medium">{c.share}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Product performance</CardTitle>
            <CardDescription>All products ranked by revenue.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Export products"
              onClick={() =>
                downloadCsv(
                  filtered.map((p) => ({
                    product: p.product,
                    quantity: p.quantity,
                    revenue: p.revenue,
                    share: p.share,
                  })),
                  'products.csv',
                )
              }
            >
              <Download className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.product}>
                  <TableCell className="font-medium">{p.product}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(p.revenue)}</TableCell>
                  <TableCell className="text-right">{p.share}%</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No products match “{query}”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
