// ---------------------------------------------------------------------------
// Pure insight computations derived from the (mock) transactions.
// These functions receive plain row arrays and return aggregate view models,
// so they can be reused verbatim once the data comes from the backend API.
// ---------------------------------------------------------------------------

export const fmtCurrency = (value, digits = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)

export const fmtNumber = (value) =>
  new Intl.NumberFormat('en-US').format(value)

// --- Overview: revenue, orders, customers, AOV (+ period deltas) -----------
export function computeOverview(rows) {
  const revenue = rows.reduce((sum, r) => sum + (r.revenue ?? r.quantity * r.unit_price), 0)
  const orders = new Set(rows.map((r) => r.order_id)).size
  const customers = new Set(rows.map((r) => r.customer_id)).size
  const aov = orders > 0 ? revenue / orders : 0

  // Split the current dataset into two halves (prev vs current) for deltas.
  const half = Math.floor(rows.length / 2)
  const current = rows.slice(half)
  const previous = rows.slice(0, half)
  const sum = (list, key) => list.reduce((s, r) => s + (r[key] ?? 0), 0)
  const currentRevenue = sum(current, 'revenue')
  const previousRevenue = sum(previous, 'revenue')
  const currentOrders = new Set(current.map((r) => r.order_id)).size
  const previousOrders = new Set(previous.map((r) => r.order_id)).size

  const pctChange = (curr, prev) =>
    prev === 0 ? 0 : Number((((curr - prev) / prev) * 100).toFixed(1))

  return {
    revenue,
    orders,
    customers,
    aov,
    revenueDelta: pctChange(currentRevenue, previousRevenue),
    ordersDelta: pctChange(currentOrders, previousOrders),
    customersCurrent: new Set(current.map((r) => r.customer_id)).size,
    customersPrevious: new Set(previous.map((r) => r.customer_id)).size,
    customersDelta: pctChange(
      new Set(current.map((r) => r.customer_id)).size,
      new Set(previous.map((r) => r.customer_id)).size,
    ),
    aovDelta: pctChange(
      currentRevenue / (currentOrders || 1),
      previousRevenue / (previousOrders || 1),
    ),
    avgOrderValue: aov,
  }
}

// --- Sales trends, grouped by day / week / month ----------------------------
export function computeTrends(rows, groupBy = 'day') {
  const grouped = new Map()

  for (const row of rows) {
    const key = groupKey(row.date, groupBy)
    if (!grouped.has(key)) {
      grouped.set(key, { label: key.label, revenue: 0, orders: 0, items: 0 })
    }
    const bucket = grouped.get(key)
    bucket.revenue += row.revenue ?? row.quantity * row.unit_price
    bucket.orders += 1
    bucket.items += row.quantity
  }

  const result = Array.from(grouped.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
  // Ensure buckets are normalized as dollar/unit values for charting.
  result.forEach((b) => {
    b.revenue = Number(b.revenue.toFixed(2))
    b.aov = b.orders > 0 ? Number((b.revenue / b.orders).toFixed(2)) : 0
  })
  return result
}

function groupKey(dateStr, groupBy) {
  const d = new Date(`${dateStr}T00:00:00`)
      if (groupBy === 'month') {
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      sort: d.toISOString().slice(0, 7),
    }
  }
  if (groupBy === 'week') {
    const monday = new Date(d)
    const day = (monday.getDay() + 6) % 7
    monday.setDate(monday.getDate() - day)
    return {
      label: `Wk ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      sort: monday.toISOString().slice(0, 10),
    }
  }
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sort: d.toISOString().slice(0, 10),
  }
}

// --- Product & category performance -----------------------------------------
export function computeProducts(rows) {
  const byProduct = new Map()
  const byCategory = new Map()

  for (const row of rows) {
    const rev = row.revenue ?? row.quantity * row.unit_price
    const key = row.product
    if (!byProduct.has(key)) {
      byProduct.set(key, {
        product: row.product,
        category: row.category,
        revenue: 0,
        quantity: 0,
        orders: 0,
      })
    }
    const p = byProduct.get(key)
    p.revenue += rev
    p.quantity += row.quantity
    p.orders += 1

    if (!byCategory.has(row.category)) {
      byCategory.set(row.category, { category: row.category, revenue: 0, orders: 0 })
    }
    const c = byCategory.get(row.category)
    c.revenue += rev
    c.orders += 1
  }

  const totalRevenue =
    Array.from(byCategory.values()).reduce((s, c) => s + c.revenue, 0) || 1

  return {
    products: Array.from(byProduct.values())
      .map((p) => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        share: Number(((p.revenue / totalRevenue) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    categories: Array.from(byCategory.values())
      .map((c) => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        share: Number(((c.revenue / totalRevenue) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    totalRevenue,
  }
}

// --- Customer behaviour, repeat detection & segmentation ---------------------
export function computeCustomers(rows) {
  const byCustomer = new Map()

  for (const row of rows) {
    const rev = row.revenue ?? row.quantity * row.unit_price
    if (!byCustomer.has(row.customer_id)) {
      byCustomer.set(row.customer_id, {
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        orders: new Set(),
        total: 0,
        firstDate: row.date,
        lastDate: row.date,
        items: 0,
      })
    }
    const c = byCustomer.get(row.customer_id)
    c.orders.add(row.order_id)
    c.total += rev
    c.items += row.quantity
    if (row.date < c.firstDate) c.firstDate = row.date
    if (row.date > c.lastDate) c.lastDate = row.date
  }

  const list = Array.from(byCustomer.values()).map((c) => {
    const orderCount = c.orders.size
    const isRepeat = orderCount > 1
    return {
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      orderCount,
      items: c.items,
      total: Number(c.total.toFixed(2)),
      firstDate: c.firstDate,
      lastDate: c.lastDate,
      isRepeat,
      segment: segmentCustomer({ orderCount, total: c.total, lastDate: c.lastDate }),
    }
  })

  const sorted = list.sort((a, b) => b.total - a.total)
  const repeatCount = sorted.filter((c) => c.isRepeat).length

  return {
    list: sorted,
    totalCustomers: list.length,
    repeatCustomers: repeatCount,
    repeatRate: list.length > 0 ? Number(((repeatCount / list.length) * 100).toFixed(1)) : 0,
    oneTimeCustomers: list.length - repeatCount,
    segments: {
      all: list,
      VIP: list.filter((c) => c.segment === 'VIP'),
      regular: list.filter((c) => c.segment === 'Regular'),
      new: list.filter((c) => c.segment === 'New'),
      atRisk: list.filter((c) => c.segment === 'At-risk'),
    },
  }
}

// Basic segmentation by recency, frequency and monetary value.
function segmentCustomer({ orderCount, total, lastDate }) {
  if (orderCount === 1) return 'New'
  if (total >= 500) return 'VIP'
  if (orderCount >= 4) return 'Regular'
  const last = new Date(`${lastDate}T00:00:00`)
  const daysSince = (Date.now() - last.getTime()) / 86400000
  if (daysSince > 45) return 'At-risk'
  return 'Regular'
}

// --- Data quality / validation summary (used by the Upload page) -------------
export function summarizeValidation(rows, warnings = 0, fixed = 0) {
  return {
    totalRows: rows.length,
    orders: new Set(rows.map((r) => r.order_id)).size,
    customers: new Set(rows.map((r) => r.customer_id)).size,
    invalidRows: warnings,
    fixedRows: fixed,
    coverage: rows.length > 0 ? 100 : 0,
    }
}