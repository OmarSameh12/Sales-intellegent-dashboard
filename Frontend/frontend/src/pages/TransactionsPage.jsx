import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { fetchTransactions } from '@/services/api'
import { fmtCurrency, fmtNumber } from '@/lib/insights'
import { downloadCsv } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/useApi'
import { ErrorState } from '@/components/error-state'

const PAGE_SIZE = 10

export function TransactionsPage() {
  const { data, loading, error, retry } = useApi(() => fetchTransactions())
  const rows = data ?? []
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(0)

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (!q) return true
      return (
        r.product.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.order_id.toLowerCase().includes(q)
      )
    })
  }, [rows, query, categoryFilter])

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, r) => sum + r.revenue, 0),
    [filtered],
  )
  const totalItems = useMemo(
    () => filtered.reduce((sum, r) => sum + r.quantity, 0),
    [filtered],
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const start = page * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid auto-rows-min gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

  if (error && rows.length === 0) {
    return <ErrorState message={error} onRetry={retry} />
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid auto-rows-min gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Rows shown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(filtered.length)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Revenue (filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Items sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(totalItems)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {rows.length.toLocaleString()} transactions loaded. Use search and filters below.
                        </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                placeholder="Search order, customer, product…"
                className="pl-8"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => { setCategoryFilter(v); setPage(0) }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(pageRows, 'transactions-page.csv')}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(rows, 'transactions-all.csv')}
            >
              Export all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.order_id}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell>{r.product}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(r.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(r.revenue)}</TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    No transactions match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

