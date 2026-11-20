import { Link } from "@tanstack/react-router"
import { Avatar } from "@/components/avatar"
import { CardHeading, cardRow } from "@/components/dashboard/card-parts"
import { Card } from "@/components/ui/card"
import { daysUntil, shortDate } from "@/lib/dates"
import type { DashboardData } from "./data"

/** "today", "yesterday" or a short date. */
function addedOn(iso: string) {
  const ago = -daysUntil(iso)
  if (ago <= 0) return "today"
  if (ago === 1) return "yesterday"
  return shortDate(iso)
}

export function NewestGymnastsCard({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeading title="Newest gymnasts" to="/gymnasts" />
      {data.newestGymnasts.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          No gymnasts{data.view === "mine" && " in your groups"} yet.
        </p>
      )}
      {data.newestGymnasts.map((g) => {
        const name = `${g.first_name} ${g.last_name}`
        const details = [g.squad, g.level].filter(Boolean).join(" · ")
        return (
          <Link
            key={g.id}
            to="/gymnasts/$gymnastId"
            params={{ gymnastId: String(g.id) }}
            className={cardRow}
          >
            <Avatar name={name} seed={g.id} className="size-9 text-xs" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Added {addedOn(g.created_at)}
                </span>
              </span>
              {details && (
                <span className="truncate text-[13px] text-muted-foreground">
                  {details}
                </span>
              )}
            </span>
          </Link>
        )
      })}
    </Card>
  )
}
