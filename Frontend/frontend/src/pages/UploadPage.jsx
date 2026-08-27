import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CloudUpload } from 'lucide-react'
import { uploadCsv } from '@/services/api'
import { setLastUpload } from '@/lib/uploadStatus'
import { toast } from '@/components/ui/sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export function UploadPage() {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const handleFiles = useCallback(async (fileList) => {
    const file = fileList[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please choose a CSV file.')
      return
    }
    setUploading(true)
    setResult(null)
    setProgress(25)
    setProgress(60)
    try {
      const res = await uploadCsv(file)
      setProgress(100)
      setResult(res)
      setLastUpload({ rows: res.summary.totalRows, fileName: res.fileName })
      setTimeout(() => {
        toast.success(
          `Imported ${res.summary.totalRows.toLocaleString()} rows from ${file.name}`,
        )
      }, 50)
    } catch (error) {
      toast.error(error?.message ?? 'Upload failed. Is the backend running?')
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload retail transactions</CardTitle>
          <CardDescription>
            Drop a CSV of your transactions. Basic validation and cleaning are
            applied before the data is shown across the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ' +
              (dragOver
                ? 'border-primary bg-muted/50'
                : 'hover:bg-muted/50')
            }
          >
            <CloudUpload className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drag &amp; drop your CSV here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              Expected columns: order_id, date, customer_id, customer_name,
              product, category, quantity, unit_price
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {uploading && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-muted-foreground text-xs">
                Validating and cleaning rows…
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription>
            Stored {result.summary.totalRows.toLocaleString()} cleaned rows from{' '}
            {result.fileName} in the database.
            {result.summary.messages.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {result.summary.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Validation summary</CardTitle>
            <CardDescription>A quick overview of the imported dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryStat label="Rows imported" value={result.summary.totalRows.toLocaleString()} />
              <SummaryStat label="Cleaning notes" value={String(result.summary.messages.length)} />
              <SummaryStat label="Source file" value={result.fileName} />
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>First 10 cleaned rows.</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.preview.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.order_id}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.revenue ? `$${row.revenue}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link to="/">
                  View dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}