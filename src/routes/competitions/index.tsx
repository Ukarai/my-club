import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { listCompetitions } from "@/server/functions/competitions"
import { Button } from "@/components/ui/button"
import { CompetitionStatusBadge } from "@/components/badges"
import { EmptyState } from "@/components/form"
import { CompetitionDialog } from "@/components/competition-form"
import { useDialog } from "@/components/gymnast-form"
import { useCan } from "@/lib/use-user"
import {
  daysUntil,
  formatDate,
  today,
  type CompetitionSummary,
} from "@/lib/domain"

export const Route = createFileRoute("/competitions/")({
  loader: () => listCompetitions(),
  component: Competitions,
})

function CompetitionRow({ c }: { c: CompetitionSummary }) {
  const days = daysUntil(c.start_date)
  return (
    <Link
      to="/competitions/$competitionId"
      params={{ competitionId: String(c.id) }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 hover:bg-muted"
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

function Competitions() {
  const comps = Route.useLoaderData()
  const navigate = useNavigate()
  const dialog = useDialog()
  const canEdit = useCan("admin")
  const t = today()
  const upcoming = comps
    .filter((c) => (c.end_date ?? c.start_date) >= t)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const past = comps.filter((c) => (c.end_date ?? c.start_date) < t)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Competitions</h1>
        {canEdit && (
          <Button onClick={dialog.show}>
            <Plus /> New competition
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Upcoming</h2>
        {upcoming.length === 0 && (
          <EmptyState title="No upcoming competitions" />
        )}
        {upcoming.map((c) => (
          <CompetitionRow key={c.id} c={c} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Past</h2>
          {past.map((c) => (
            <CompetitionRow key={c.id} c={c} />
          ))}
        </section>
      )}

      <CompetitionDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        onSaved={(id) =>
          navigate({
            to: "/competitions/$competitionId",
            params: { competitionId: String(id) },
          })
        }
      />
    </div>
  )
}
