import { AlertCircle, RotateCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Shown whenever a dashboard request fails — keeps navigation usable
// even when the backend is offline.
export function ErrorState({ message, onRetry }) {
  return (
    <Alert variant="destructive" className="items-start">
      <AlertCircle className="size-4" />
      <div className="flex-1">
        <AlertTitle>Couldn&apos;t load data</AlertTitle>
        <AlertDescription>
          {message ?? 'Something went wrong.'} Make sure the FastAPI backend is
          running on http://127.0.0.1:8000.
        </AlertDescription>
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={onRetry}>
            <RotateCw className="size-3.5" />
            Retry
          </Button>
        )}
      </div>
    </Alert>
  )
}
