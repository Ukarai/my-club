import { cn } from "cn"
import { Card, CardContent } from "@/components/ui/card"

export function Summary({
  label,
  value,
  sub,
  warn,
}: {
  label: string
  value: string
  sub?: string
  warn?: boolean
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "text-lg font-semibold tabular-nums",
            warn && "text-destructive"
          )}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}
