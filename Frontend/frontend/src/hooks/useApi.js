import { useCallback, useEffect, useState } from 'react'

// Shared data-fetching state for dashboard pages.
// Handles loading / error / data uniformly and exposes a retry callback,
// so a failed request never leaves a page stuck on its skeleton.
export function useApi(fetcher) {
  const [tick, setTick] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.resolve()
      .then(fetcher)
      .then((result) => {
        if (!active) return
        setData(result)
        setLoading(false)
      })
      .catch((e) => {
        if (!active) return
        setError(e?.message ?? 'Request failed')
        setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const retry = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, retry }
}
