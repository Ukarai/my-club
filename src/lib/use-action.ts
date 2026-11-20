import * as React from "react"

/**
 * Wrap an async mutation with pending + error state, so every form gets
 * the same "Saving…" and error feedback.
 */
export function useAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>
) {
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const run = React.useCallback(
    async (...args: TArgs) => {
      setPending(true)
      setError(null)
      try {
        await fn(...args)
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return false
      } finally {
        setPending(false)
      }
    },
    [fn]
  )
  return { run, pending, error }
}
