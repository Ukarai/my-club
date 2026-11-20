import type * as React from "react"

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
