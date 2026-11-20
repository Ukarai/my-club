import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { CompetitionStatusBadge } from "@/components/badges"
import { CardHeading, cardRow } from "@/components/dashboard/card-parts"
import { Card } from "@/components/ui/card"
import { daysUntil, inDays, parseIso } from "@/lib/dates"
import type { DashboardData } from "./data"

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Month and day stacked in a small tinted block. */
function DateBlock({ iso, className }: { iso: string; className: string }) {
  const date = parseIso(iso)
  return (
    <span
      className={cn(
        "flex w-[50px] shrink-0 flex-col items-center rounded-[10px] py-1.5",
        className
      )}
    >
      <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
      <span className="text-xl leading-[1.1] font-extrabold">
        {date.getDate()}
      </span>
    </span>
  )
}

export function CompetitionsCard({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeading title="Upcoming competitions" to="/competitions" />
      {data.upcoming.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          Nothing scheduled.{" "}
          <Link to="/competitions" className="text-primary underline">
            Add a competition
          </Link>
        </p>
      )}
      {data.upcoming.map((c) => {
        const days = daysUntil(c.start_date)
        const deadline = c.entry_deadline ? daysUntil(c.entry_deadline) : null
        return (
          <Link
            key={c.id}
            to="/competitions/$competitionId"
            params={{ competitionId: String(c.id) }}
            className={cardRow}
          >
            <DateBlock
              iso={c.start_date}
              className={
                days <= 30
                  ? "bg-primary-soft text-primary-dark"
                  : "bg-secondary text-[#364660]"
              }
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{c.name}</span>
              <span className="text-[13px] text-muted-foreground">
                {parseIso(c.start_date).getFullYear() !==
                  new Date().getFullYear() &&
                  `${parseIso(c.start_date).getFullYear()} · `}
                {capitalize(inDays(days))} · {c.entry_count} entered
                {c.my_entry_count !== null && c.entry_count > 0 && (
                  <span
                    className={cn(
                      c.my_entry_count > 0 && "font-semibold text-primary-dark"
                    )}
                  >
                    {" "}
                    · {c.my_entry_count} from your groups
                  </span>
                )}
              </span>
              {deadline !== null && deadline >= 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    deadline <= 7 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  Entries close {inDays(deadline)}
                </span>
              )}
            </span>
            <span className="max-sm:hidden">
              <CompetitionStatusBadge status={c.status} />
            </span>
          </Link>
        )
      })}
    </Card>
  )
}
