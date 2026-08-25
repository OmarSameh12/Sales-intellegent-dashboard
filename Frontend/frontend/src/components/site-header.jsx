import { useRef, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Loader2, Moon, Sun, Upload } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { downloadCsv } from '@/lib/export'
import { fetchTransactions, uploadCsv } from '@/services/api'
import { fmtNumber } from '@/lib/insights'
import { getLastUpload, onUploadChange, setLastUpload } from '@/lib/uploadStatus'
import { toast } from '@/components/ui/sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const pageMeta = {
  '/': { group: 'Dashboard', title: 'Overview' },
  '/trends': { group: 'Analytics', title: 'Sales Trends' },
  '/products': { group: 'Analytics', title: 'Products' },
  '/customers': { group: 'Analytics', title: 'Customers' },
  '/transactions': { group: 'Data', title: 'Transactions' },
  '/upload': { group: 'Data', title: 'Upload Data' },
}

export function SiteHeader() {
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? { group: 'Dashboard', title: 'Overview' }

  // Live "last upload" status (set by the Upload page, persisted locally).
  const [lastUpload, setLastUploadState] = useState(getLastUpload)

  useEffect(
    () => onUploadChange(() => setLastUploadState(getLastUpload())),
    [],
  )

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])

  // Quick CSV import straight from the header (POST /api/transactions/upload).
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const handleImportFiles = async (fileList) => {
    const file = fileList?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please choose a CSV file.')
      return
    }
    setImporting(true)
    try {
      const res = await uploadCsv(file)
      setLastUpload({ rows: res.summary.totalRows, fileName: res.fileName })
      setLastUploadState(getLastUpload())
      toast.success(
        `Imported ${fmtNumber(res.summary.totalRows)} rows from ${res.fileName}`,
        {
          description: res.summary.messages[0],
          action: { label: 'Reload', onClick: () => window.location.reload() },
        },
      )
    } catch (error) {
      toast.error(error?.message ?? 'Import failed. Is the backend running?')
    } finally {
      setImporting(false)
    }
  }

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b sticky top-0 z-10 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <span className="text-muted-foreground">{meta.group}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{meta.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant="secondary"
            className="hidden sm:inline-flex"
            title={lastUpload?.fileName}
          >
            {lastUpload
              ? `Last upload: ${fmtNumber(lastUpload.rows)} rows`
              : 'No data uploaded yet'}
          </Badge>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              handleImportFiles(e.target.files)
              e.target.value = ''
            }}
          />

          <Button
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {importing ? 'Importing…' : 'Import Data'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Download report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => exportCurrentPage(location.pathname)}>
                Current view (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem>All transactions (CSV)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* Author */}
          <div className="ml-1 hidden items-center gap-2 border-l pl-3 md:flex">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">OS</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium lg:inline">Omar Sameh</span>
          </div>
        </div>
      </div>
    </header>
  )
}

async function exportCurrentPage() {
  try {
    const rows = await fetchTransactions()
    downloadCsv(rows, 'transactions-all.csv')
  } catch {
    downloadCsv(
      [{ error: 'Could not reach the backend. Is it running on port 8000?' }],
      'export-error.csv',
    )
  }
}