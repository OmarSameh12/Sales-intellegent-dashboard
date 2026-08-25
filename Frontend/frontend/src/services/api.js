// ---------------------------------------------------------------------------
// Data access layer — wired to the FastAPI backend (Retail Analytics API).
//
// Endpoints consumed (Backend/app):
//   GET  /api/transactions        -> raw rows, newest first
//   GET  /api/dashboard           -> aggregates (summary / sales_trend /
//                                    products / categories / customers)
//   POST /api/transactions/upload -> multipart CSV import
//
// The Vite dev server proxies "/api" to http://127.0.0.1:8000 (vite.config.js),
// so requests stay same-origin and no CORS middleware is needed upstream.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }
  return res.json()
}

// Backend row -> page shape (total_amount is renamed to revenue).
function mapTransactionRow(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    date: row.date,
    customer_id: row.customer_id,
    customer_name: row.customer_name ?? 'Unknown customer',
    product: row.product,
    category: row.category ?? 'Other',
    quantity: row.quantity,
    unit_price: row.unit_price,
    revenue: row.total_amount,
  }
}

// GET /api/transactions
export async function fetchTransactions() {
  const rows = await request('/api/transactions')
  return rows.map(mapTransactionRow)
}

const fmtDayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

// GET /api/dashboard — overview KPIs straight from the backend summary
export async function fetchOverview() {
  const data = await request('/api/dashboard')
  return {
    revenue: data.summary.revenue,
    orders: data.summary.orders,
    customers: data.summary.customers,
    aov: data.summary.average_order_value,
    avgOrderValue: data.summary.average_order_value,
  }
}

// GET /api/dashboard — daily sales trend, exactly as the backend implements it
export async function fetchTrends() {
  const data = await request('/api/dashboard')
  return (data.sales_trend ?? []).map((d) => ({
    label: fmtDayLabel(d.date),
    date: d.date,
    revenue: d.revenue,
    orders: d.orders,
    aov: d.orders > 0 ? Number((d.revenue / d.orders).toFixed(2)) : 0,
  }))
}

// GET /api/dashboard — product & category performance (share computed here)
export async function fetchProducts() {
  const data = await request('/api/dashboard')
  const products = (data.products ?? []).map((p) => ({ ...p }))
  const categories = (data.categories ?? []).map((c) => ({ ...c }))

  const productRevenue = products.reduce((s, p) => s + p.revenue, 0)
  products.forEach((p) => {
    p.share =
      productRevenue > 0
        ? Number(((p.revenue / productRevenue) * 100).toFixed(1))
        : 0
  })

  const categoryRevenue = categories.reduce((s, c) => s + c.revenue, 0)
  categories.forEach((c) => {
    c.share =
      categoryRevenue > 0
        ? Number(((c.revenue / categoryRevenue) * 100).toFixed(1))
        : 0
  })

  return { products, categories, totalRevenue: productRevenue }
}

// GET /api/dashboard — customers using the backend segmentation
// (New / High Value / Returning) and field names (orders / spending / last_purchase)
export async function fetchCustomers() {
  const data = await request('/api/dashboard')
  const list = (data.customers?.data ?? []).map((c) => ({
    customer_id: c.customer_id,
    customer_name: c.customer_name ?? 'Unknown customer',
    orderCount: c.orders,
    total: c.spending,
    lastPurchase: c.last_purchase,
    segment: c.segment,
    isRepeat: c.orders > 1,
  }))

  const totalCustomers = data.customers?.total ?? list.length
  const repeatCustomers =
    data.customers?.repeat_customers ?? list.filter((c) => c.isRepeat).length

  return {
    list,
    totalCustomers,
    repeatCustomers,
    repeatRate:
      totalCustomers > 0
        ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(1))
        : 0,
    oneTimeCustomers: totalCustomers - repeatCustomers,
  }
}

// GET /api/transactions — newest-first slice for the overview table
export async function fetchRecentOrders(limit = 8) {
  const rows = await request('/api/transactions')
  return rows.slice(0, limit).map(mapTransactionRow)
}

// POST /api/transactions/upload
export async function uploadCsv(file) {
  const formData = new FormData()
  formData.append('file', file)

  const data = await request('/api/transactions/upload', {
    method: 'POST',
    body: formData,
  })

  return {
    fileName: file.name,
    sizeBytes: file.size,
    summary: {
      totalRows: data.rows_processed ?? 0,
      messages: data.messages ?? [],
    },
    preview: [],
  }
}

