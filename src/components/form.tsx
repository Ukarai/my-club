import * as React from "react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"

export function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

/** Read a <form>'s fields as a plain string record. */
export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(
    Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)])
  ) as Record<string, string>
}

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

export function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-sm text-destructive">{error}</p>
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-[#a9b8cd] bg-card/60 p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      {children}
    </div>
  )
}
