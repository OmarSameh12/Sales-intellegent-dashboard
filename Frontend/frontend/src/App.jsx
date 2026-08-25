import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { OverviewPage } from '@/pages/OverviewPage'
import { TrendsPage } from '@/pages/TrendsPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { UploadPage } from '@/pages/UploadPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
