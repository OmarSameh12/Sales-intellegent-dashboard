// ---------------------------------------------------------------------------
// Mock retail transaction data.
//
// Shapes mirror the backend `Transaction` model:
//   id, order_id, date, customer_id, customer_name, product, category,
//   quantity, unit_price  (+ our derived `revenue`)
//
// This file is the ONLY source of "dummy" data. When the backend API is ready
// (upload + transactions endpoints), swap this module out in `services/api.js`.
// ---------------------------------------------------------------------------

// Deterministic pseudo-random generator (mulberry32) so the mock dataset is
// stable across reloads.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST_NAMES = [
  'Amira', 'Jake', 'Sofia', 'Marcus', 'Aisha', 'Leo', 'Nadia', 'Ethan',
  'Priya', 'Diego', 'Hana', 'Omar', 'Lena', 'Tom', 'Yara', 'Noah', 'Zoe',
  'Kofi', 'Ines', 'Ravi', 'Maya', 'Felix', 'Ana', 'Boris', 'Ivy', 'Kai',
  'Nora', 'Sam', 'Ruth', 'Dean',
]

const LAST_NAMES = [
  'Haddad', 'Nguyen', 'Ali', 'Garcia', 'Patel', 'Kim', 'Rossi', 'Mensah',
  'Okafor', 'Sato', 'Kowalski', 'Silva', 'Hansen', 'Novak', 'Andersen',
  'Moreau', 'Costa', 'Tan', 'Larsen', 'Fischer',
]

const PRODUCTS = [
  { product: 'Coffee Beans 1kg', category: 'Grocery', unit_price: 14.5 },
  { product: 'Organic Milk 2L', category: 'Grocery', unit_price: 4.2 },
  { product: 'Sourdough Bread', category: 'Grocery', unit_price: 3.8 },
  { product: 'Olive Oil 750ml', category: 'Grocery', unit_price: 12.9 },
  { product: 'Free-Range Eggs x12', category: 'Grocery', unit_price: 5.4 },
  { product: 'Wireless Mouse', category: 'Electronics', unit_price: 29.99 },
  { product: 'Mechanical Keyboard', category: 'Electronics', unit_price: 89.0 },
  { product: 'USB-C Hub', category: 'Electronics', unit_price: 39.5 },
  { product: 'Noise-Cancelling Buds', category: 'Electronics', unit_price: 129.0 },
  { product: '4K Webcam', category: 'Electronics', unit_price: 99.0 },
  { product: 'Desk Lamp LED', category: 'Electronics', unit_price: 34.0 },
  { product: 'Gaming Headset', category: 'Electronics', unit_price: 74.0 },
  { product: 'Cotton T-Shirt', category: 'Apparel', unit_price: 18.0 },
  { product: 'Denim Jacket', category: 'Apparel', unit_price: 59.0 },
  { product: 'Running Sneakers', category: 'Apparel', unit_price: 82.0 },
  { product: 'Wool Beanie', category: 'Apparel', unit_price: 15.0 },
  { product: 'Leather Belt', category: 'Apparel', unit_price: 28.0 },
  { product: 'Linen Shirt', category: 'Apparel', unit_price: 45.0 },
  { product: 'Ceramic Mug Set', category: 'Home', unit_price: 24.0 },
  { product: 'Cotton Throw Blanket', category: 'Home', unit_price: 42.0 },
  { product: 'Scented Candle', category: 'Home', unit_price: 16.0 },
  { product: 'Bamboo Cutting Board', category: 'Home', unit_price: 21.0 },
  { product: 'Cast Iron Skillet', category: 'Home', unit_price: 47.0 },
  { product: 'Throw Pillow', category: 'Home', unit_price: 19.5 },
  { product: 'Vitamin C Serum', category: 'Beauty', unit_price: 22.0 },
  { product: 'Moisturizer SPF', category: 'Beauty', unit_price: 26.0 },
  { product: 'Shampoo Bar', category: 'Beauty', unit_price: 11.0 },
  { product: 'Perfume 50ml', category: 'Beauty', unit_price: 68.0 },
  { product: 'Facial Cleanser', category: 'Beauty', unit_price: 16.5 },
  { product: 'Bathrobe', category: 'Home', unit_price: 38.0 },
]

// Build the dataset: ~90 days of sales for ~200 customers.
export function generateTransactions(days = 90, targetRows = 1250) {
  const rand = mulberry32(20260825)
  const customers = []
  for (let i = 0; i < 200; i++) {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
    customers.push({
      customer_id: `CUS-${String(i + 1).padStart(4, '0')}`,
      customer_name: `${firstName} ${lastName}`,
    })
  }

  const rows = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let orderCounter = 0

  for (let i = 0; i < targetRows; i++) {
    // Skew toward recent dates so trends look alive.
    const dayOffset = Math.floor(Math.pow(rand(), 1.6) * days)
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)

    const customer = customers[Math.floor(rand() * customers.length)]
    const productDef = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]
    const quantity = 1 + Math.floor(rand() * (rand() > 0.9 ? 6 : 3))
    const unit_price = productDef.unit_price
    const revenue = Number((quantity * unit_price).toFixed(2))

    orderCounter += 1
    rows.push({
      id: i + 1,
      order_id: `ORD-${String(orderCounter).padStart(5, '0')}`,
      date: date.toISOString().slice(0, 10),
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      product: productDef.product,
      category: productDef.category,
      quantity,
      unit_price,
      revenue,
    })
  }

  // Sort by date ascending (oldest first) then order id.
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.order_id.localeCompare(b.order_id))
  return rows
}