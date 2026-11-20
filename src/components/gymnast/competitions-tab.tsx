import { Link } from "@tanstack/react-router"
import { EntryStatusBadge } from "@/components/badges"
import { EmptyState } from "@/components/empty-state"
import { formatDate } from "@/lib/dates"
import type { GymnastData } from "./data"

export function CompetitionsTab({ data }: { data: GymnastData }) {
  if (data.entries.length === 0)
    return (
      <EmptyState title="No competition entries">
        <p>
          Add {data.gymnast.first_name} to a competition from the{" "}
          <Link to="/competitions" className="underline">
            Competitions
          </Link>{" "}
          page.
        </p>
      </EmptyState>
    )
  return (
    <div className="flex flex-col gap-2">
      {data.entries.map((e) => (
        <Link
          key={e.id}
          to="/competitions/$competitionId"
          params={{ competitionId: String(e.competition_id) }}
          className="surface flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-[#f6f8fb]"
        >
          <div>
            <div className="font-medium">{e.competition_name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(e.start_date)}
              {e.category && ` · ${e.category}`}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {e.score !== null && (
              <span className="tabular-nums">{e.score.toFixed(3)}</span>
            )}
            {e.placing !== null && (
              <span className="font-semibold">#{e.placing}</span>
            )}
            <EntryStatusBadge status={e.status} />
          </div>
        </Link>
      ))}
    </div>
  )
}
