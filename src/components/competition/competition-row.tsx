import { Link } from "@tanstack/react-router"
import { CompetitionStatusBadge } from "@/components/badges"
import { daysUntil, formatDate } from "@/lib/dates"
import { type CompetitionSummary } from "@/lib/domain"

export function CompetitionRow({ c }: { c: CompetitionSummary }) {
  const days = daysUntil(c.start_date)
  return (
    <Link
      to="/competitions/$competitionId"
      params={{ competitionId: String(c.id) }}
      className="surface flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#f6f8fb]"
    >
      <div className="min-w-0">
        <div className="font-medium">{c.name}</div>
        <div className="text-sm text-muted-foreground">
          {formatDate(c.start_date)}
          {c.end_date &&
            c.end_date !== c.start_date &&
            ` – ${formatDate(c.end_date)}`}
          {c.venue && ` · ${c.venue}`}
          {c.level && ` · ${c.level}`}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {days >= 0 && (
          <span className="text-muted-foreground">
            {days === 0 ? "Today" : `${days} days`}
          </span>
        )}
        <span className="tabular-nums">{c.entry_count} entries</span>
        {c.open_tasks > 0 && (
          <span className="text-muted-foreground tabular-nums">
            {c.open_tasks} tasks open
          </span>
        )}
        <CompetitionStatusBadge status={c.status} />
      </div>
    </Link>
  )
}
