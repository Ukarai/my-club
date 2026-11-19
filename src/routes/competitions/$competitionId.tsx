import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Lock, Pencil, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  deleteCompetition,
  getCompetition,
} from "@/server/functions/competitions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompetitionStatusBadge } from "@/components/badges"
import { FormError, useAction } from "@/components/form"
import { CompetitionDialog } from "@/components/competition-form"
import { useDialog } from "@/components/gymnast-form"
import { daysUntil, formatDate } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import { EntriesTab } from "@/components/competition/entries-tab"
import { RoutinesTab } from "@/components/competition/routines-tab"
import { TasksTab } from "@/components/competition/tasks-tab"
import { ResultsTab } from "@/components/competition/results-tab"

const TABS = ["entries", "routines", "tasks", "results"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/competitions/$competitionId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
  loader: ({ params }) =>
    getCompetition({ data: Number(params.competitionId) }),
  component: CompetitionPage,
})

function CompetitionPage() {
  const data = Route.useLoaderData()
  const { tab = "entries" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const edit = useDialog()
  const canEdit = useCan("admin")
  const c = data.competition
  const active = data.entries.filter((e) => e.status !== "withdrawn")
  const unpaid = active.filter((e) => !e.fee_paid).length
  const openTasks = data.tasks.filter((t) => !t.done).length
  const days = daysUntil(c.start_date)
  const deadline = c.entry_deadline ? daysUntil(c.entry_deadline) : null

  const remove = useAction(async () => {
    if (
      !confirm(
        `Delete "${c.name}" with all its entries, routines and tasks? This can't be undone.`
      )
    )
      return
    await deleteCompetition({ data: c.id })
    await navigate({ to: "/competitions" })
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/competitions"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Competitions
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {c.name} <CompetitionStatusBadge status={c.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(c.start_date)}
            {c.end_date &&
              c.end_date !== c.start_date &&
              ` – ${formatDate(c.end_date)}`}
            {days >= 0 && ` (${days === 0 ? "today" : `in ${days} days`})`}
            {c.venue && ` · ${c.venue}`}
            {c.organiser && ` · ${c.organiser}`}
            {c.level && ` · ${c.level}`}
          </p>
        </div>
        <div className={cn("flex gap-2", !canEdit && "hidden")}>
          <Button variant="outline" onClick={edit.show}>
            <Pencil /> Edit
          </Button>
          {canEdit && (
            <Button
              variant="destructive"
              size="icon"
              aria-label="Delete competition"
              onClick={() => remove.run()}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      <FormError error={remove.error} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Entries" value={String(active.length)} />
        <Summary
          label="Entry deadline"
          value={c.entry_deadline ? formatDate(c.entry_deadline) : "—"}
          warn={deadline !== null && deadline >= 0 && deadline <= 7}
          sub={
            deadline !== null && deadline >= 0
              ? `${deadline} days left`
              : undefined
          }
        />
        <Summary
          label="Fees unpaid"
          value={String(unpaid)}
          warn={unpaid > 0}
          sub={
            c.entry_fee
              ? `£${(unpaid * c.entry_fee).toFixed(2)} outstanding`
              : undefined
          }
        />
        <Summary
          label="Open tasks"
          value={String(openTasks)}
          warn={openTasks > 0 && days <= 7}
        />
      </div>
      {c.notes && (
        <p className="rounded-2xl bg-muted/60 p-3 text-sm whitespace-pre-line">
          {c.notes}
        </p>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: { tab: v as Tab }, replace: true })
        }
      >
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="routines">
            Routines
            {c.routines_locked ? (
              <Lock className="size-3.5" aria-label="locked" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{openTasks > 0 && ` (${openTasks})`}
          </TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="pt-4">
          <EntriesTab data={data} />
        </TabsContent>
        <TabsContent value="routines" className="pt-4">
          <RoutinesTab data={data} />
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <TasksTab data={data} />
        </TabsContent>
        <TabsContent value="results" className="pt-4">
          <ResultsTab data={data} />
        </TabsContent>
      </Tabs>

      <CompetitionDialog
        open={edit.open}
        onOpenChange={edit.onOpenChange}
        competition={c}
      />
    </div>
  )
}

function Summary({
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

// ───────────────────────────── Entries ─────────────────────────────
