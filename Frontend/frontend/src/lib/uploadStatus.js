// Tracks the most recent CSV upload so the header badge can show live data
// without extra API calls. Persists across reloads via localStorage and
// notifies listeners through a window event.
const KEY = 'shoplens:last-upload'
const EVENT = 'shoplens:upload-updated'

export function getLastUpload() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setLastUpload({ rows, fileName }) {
  const value = { rows, fileName, at: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT))
}

// Returns an unsubscribe function.
export function onUploadChange(handler) {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
