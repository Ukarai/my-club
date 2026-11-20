import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { listCompetitions } from "@/server/functions/competitions"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { CompetitionDialog } from "@/components/competition-form"
import { useDialog } from "@/components/gymnast-form"
import { useCan } from "@/lib/use-user"
import { today } from "@/lib/dates"
import { CompetitionRow } from "@/components/competition/competition-row"

export const Route = createFileRoute("/competitions/")({
  loader: () => listCompetitions(),
  component: Competitions,
})

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
