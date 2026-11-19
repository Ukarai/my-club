import * as React from "react"
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  addEntries,
  deleteCompetition,
  deleteTask,
  getCompetition,
  removeEntry,
  saveTask,
  setTaskDone,
  updateEntry,
  type EntryPatch,
} from "@/server/functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CompetitionStatusBadge, EntryStatusBadge } from "@/components/badges"
import {
  EmptyState,
  Field,
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import { CompetitionDialog } from "@/components/competition-form"
import { useDialog } from "@/components/gymnast-form"
import {
  ENTRY_STATUSES,
  SKILL_STATUSES,
  daysUntil,
  formatDate,
  labelFor,
  type Entry,
} from "@/lib/domain"
import { useCan } from "@/lib/use-user"

const TABS = ["entries", "routines", "tasks", "results"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/competitions/$competitionId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
  loader: ({ params }) =>
    getCompetition({ data: Number(params.competitionId) }),
  component: CompetitionPage,
})

type Data = Awaited<ReturnType<typeof getCompetition>>

/** Save a partial entry update and refresh the page data. */
function useEntryUpdate() {
  const router = useRouter()
  return useAction(async (patch: EntryPatch) => {
    await updateEntry({ data: patch })
    await router.invalidate()
  })
}

function CompetitionPage() {
  const data = Route.useLoaderData()
  const { tab = "entries" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const edit = useDialog()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
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
          {isAdmin && (
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
          <TabsTrigger value="routines">Routines</TabsTrigger>
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

function EntriesTab({ data }: { data: Data }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const upd = useEntryUpdate()
  const [selected, setSelected] = React.useState<number[]>([])
  const entered = new Set(data.entries.map((e) => e.gymnast_id))
  const available = data.gymnasts.filter((g) => !entered.has(g.id))

  const add = useAction(async (form: HTMLFormElement) => {
    if (!selected.length) throw new Error("Pick at least one gymnast")
    await addEntries({
      data: {
        competitionId: data.competition.id,
        gymnastIds: selected,
        category: formValues(form).category,
      },
    })
    setSelected([])
    form.reset()
    await router.invalidate()
  })
  const del = useAction(async (e: Entry) => {
    if (
      !confirm(
        `Remove ${e.gymnast_name} from this competition (including their routines and result)?`
      )
    )
      return
    await removeEntry({ data: e.id })
    await router.invalidate()
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-3 overflow-hidden">
        <FormError error={upd.error ?? del.error} />
        {data.entries.length === 0 ? (
          <EmptyState title="No entries yet">
            {canEdit && <p>Choose gymnasts on the right to enter them.</p>}
          </EmptyState>
        ) : (
          <fieldset
            disabled={!canEdit}
            className="min-w-0 overflow-x-auto rounded-2xl border"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gymnast</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((e) => (
                  <TableRow
                    key={e.id}
                    className={e.status === "withdrawn" ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <Link
                        to="/gymnasts/$gymnastId"
                        params={{ gymnastId: String(e.gymnast_id) }}
                        className="font-medium hover:underline"
                      >
                        {e.gymnast_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Input
                        key={e.category}
                        defaultValue={e.category ?? ""}
                        placeholder="Age group / level"
                        className="min-w-36"
                        aria-label={`Category for ${e.gymnast_name}`}
                        onBlur={(ev) =>
                          ev.target.value !== (e.category ?? "") &&
                          upd.run({ id: e.id, category: ev.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        value={e.status}
                        className="min-w-28"
                        aria-label={`Status for ${e.gymnast_name}`}
                        onChange={(ev) =>
                          upd.run({ id: e.id, status: ev.target.value })
                        }
                      >
                        {ENTRY_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={!!e.fee_paid}
                        aria-label={`Fee paid for ${e.gymnast_name}`}
                        onChange={(ev) =>
                          upd.run({ id: e.id, fee_paid: ev.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Remove ${e.gymnast_name}`}
                        onClick={() => del.run(e)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </fieldset>
        )}
      </div>

      <Card size="sm" className={cn("self-start", !canEdit && "hidden")}>
        <CardHeader>
          <CardTitle>Add gymnasts</CardTitle>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every active gymnast is already entered.
            </p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(ev) => {
                ev.preventDefault()
                add.run(ev.currentTarget)
              }}
            >
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border p-2">
                {available.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={(ev) =>
                        setSelected((s) =>
                          ev.target.checked
                            ? [...s, g.id]
                            : s.filter((x) => x !== g.id)
                        )
                      }
                    />
                    {g.first_name} {g.last_name}
                    {g.squad && (
                      <span className="text-xs text-muted-foreground">
                        {g.squad}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <Field label="Category (optional)" htmlFor="category">
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g. Regional 2 — 13-14"
                />
              </Field>
              <FormError error={add.error} />
              <Button type="submit" disabled={add.pending || !selected.length}>
                <Plus /> Enter {selected.length || ""} gymnast
                {selected.length === 1 ? "" : "s"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────── Routines ─────────────────────────────

const READY = new Set(["independent", "in_routine"])

function RoutinesTab({ data }: { data: Data }) {
  const active = data.entries.filter((e) => e.status !== "withdrawn")
  if (!active.length)
    return (
      <EmptyState title="Enter gymnasts first to build their routine cards" />
    )
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Up to 10 skills per routine. Skills marked ✓ are ones the gymnast can
        already do independently; repeated skills and skills not yet independent
        are flagged.
      </p>
      {active.map((e) => (
        <RoutineCard key={e.id} entry={e} data={data} />
      ))}
    </div>
  )
}

function RoutineCard({ entry, data }: { entry: Entry; data: Data }) {
  const upd = useEntryUpdate()
  const canEdit = useCan("coach")
  const statusFor = new Map(
    data.readySkills
      .filter((r) => r.gymnast_id === entry.gymnast_id)
      .map((r) => [r.skill_id, r.status])
  )
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {entry.gymnast_name}
          {entry.category && (
            <span className="text-sm font-normal text-muted-foreground">
              {entry.category}
            </span>
          )}
          <EntryStatusBadge status={entry.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {(["routine1", "routine2"] as const).map((key, i) => (
          <RoutineEditor
            key={key}
            title={i === 0 ? "Routine 1 (set)" : "Routine 2 (voluntary)"}
            routine={entry[key]}
            skills={data.skills}
            statusFor={statusFor}
            disabled={!canEdit || upd.pending}
            onChange={(routine) => upd.run({ id: entry.id, [key]: routine })}
          />
        ))}
        <FormError error={upd.error} />
      </CardContent>
    </Card>
  )
}

function RoutineEditor({
  title,
  routine,
  skills,
  statusFor,
  disabled,
  onChange,
}: {
  title: string
  routine: number[]
  skills: Data["skills"]
  statusFor: Map<number, string>
  disabled: boolean
  onChange: (r: number[]) => void
}) {
  const slots = Array.from({ length: 10 }, (_, i) => routine[i] ?? 0)
  const byId = new Map(skills.map((s) => [s.id, s]))
  const seen = new Set<number>()
  // Repeated skills score no tariff, so count each skill once.
  const tariff = slots.reduce((sum, id) => {
    if (!id || seen.has(id)) return sum
    seen.add(id)
    return sum + (byId.get(id)?.tariff ?? 0)
  }, 0)
  const counts = slots.reduce(
    (m, id) => (id ? m.set(id, (m.get(id) ?? 0) + 1) : m),
    new Map<number, number>()
  )

  function setSlot(i: number, id: number) {
    const next = [...slots]
    next[i] = id
    // Trim trailing empties so stored routines stay compact.
    while (next.length && !next[next.length - 1]) next.pop()
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-sm text-muted-foreground">
          Tariff{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {tariff.toFixed(1)}
          </span>
        </span>
      </div>
      <ol className="flex flex-col gap-1">
        {slots.map((id, i) => {
          const status = id ? statusFor.get(id) : undefined
          const repeated = id > 0 && (counts.get(id) ?? 0) > 1
          const notReady = id > 0 && !READY.has(status ?? "")
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <NativeSelect
                value={id || ""}
                disabled={disabled}
                aria-label={`${title} skill ${i + 1}`}
                className={cn(
                  (repeated || notReady) && "ring-1 ring-amber-400"
                )}
                onChange={(e) => setSlot(i, Number(e.target.value))}
              >
                <option value="">—</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {READY.has(statusFor.get(s.id) ?? "") ? "✓ " : ""}
                    {s.name} ({s.tariff.toFixed(1)})
                  </option>
                ))}
              </NativeSelect>
              <span className="w-4">
                {(repeated || notReady) && (
                  <AlertTriangle
                    className="size-4 text-amber-500"
                    aria-label={
                      repeated
                        ? "Repeated skill — counts for no tariff"
                        : `Not independent yet (${status ? labelFor(SKILL_STATUSES, status) : "not started"})`
                    }
                  >
                    <title>
                      {repeated
                        ? "Repeated skill — counts for no tariff"
                        : `Not independent yet (${status ? labelFor(SKILL_STATUSES, status) : "not started"})`}
                    </title>
                  </AlertTriangle>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ───────────────────────────── Tasks ─────────────────────────────

function TasksTab({ data }: { data: Data }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const add = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveTask({
      data: {
        competitionId: data.competition.id,
        title: v.title,
        due_date: v.due_date,
        assignee: v.assignee,
      },
    })
    form.reset()
    await router.invalidate()
  })
  const act = useAction(async (fn: () => Promise<unknown>) => {
    await fn()
    await router.invalidate()
  })

  return (
    <div className="flex flex-col gap-4">
      <form
        className={cn("flex flex-wrap items-end gap-2", !canEdit && "hidden")}
        onSubmit={(e) => {
          e.preventDefault()
          add.run(e.currentTarget)
        }}
      >
        <Field label="Task" htmlFor="title" className="min-w-56 flex-1">
          <Input
            id="title"
            name="title"
            required
            placeholder="e.g. Submit routine cards"
          />
        </Field>
        <Field label="Due" htmlFor="due_date">
          <Input id="due_date" name="due_date" type="date" />
        </Field>
        <Field label="Who" htmlFor="assignee">
          <Input id="assignee" name="assignee" placeholder="Optional" />
        </Field>
        <Button type="submit" disabled={add.pending}>
          <Plus /> Add
        </Button>
      </form>
      <FormError error={add.error ?? act.error} />

      {data.tasks.length === 0 ? (
        <EmptyState title="No tasks yet">
          <p>
            Track things like entries, fees, routine cards, coaches, judges and
            travel.
          </p>
        </EmptyState>
      ) : (
        <fieldset disabled={!canEdit} className="min-w-0">
          <ul className="flex flex-col divide-y rounded-2xl border">
            {data.tasks.map((t) => {
              const overdue = !t.done && t.due_date && daysUntil(t.due_date) < 0
              return (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={!!t.done}
                    aria-label={`Mark "${t.title}" done`}
                    onChange={(e) =>
                      act.run(() =>
                        setTaskDone({
                          data: { id: t.id, done: e.target.checked },
                        })
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm",
                        t.done && "text-muted-foreground line-through"
                      )}
                    >
                      {t.title}
                    </div>
                    <div
                      className={cn(
                        "text-xs text-muted-foreground",
                        overdue && "text-destructive"
                      )}
                    >
                      {[
                        t.due_date && `Due ${formatDate(t.due_date)}`,
                        t.assignee,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Delete "${t.title}"`}
                    onClick={() => act.run(() => deleteTask({ data: t.id }))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}
    </div>
  )
}

// ───────────────────────────── Results ─────────────────────────────

function ResultsTab({ data }: { data: Data }) {
  const upd = useEntryUpdate()
  const canEdit = useCan("coach")
  const active = data.entries.filter((e) => e.status !== "withdrawn")
  if (!active.length)
    return <EmptyState title="No entries to record results for" />

  const num = (v: string) => (v.trim() === "" ? null : Number(v))

  return (
    <div className="flex flex-col gap-3">
      <FormError error={upd.error} />
      <fieldset
        disabled={!canEdit}
        className="min-w-0 overflow-x-auto rounded-2xl border"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gymnast</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-32">Total score</TableHead>
              <TableHead className="w-24">Placing</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.gymnast_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {e.category ?? "—"}
                </TableCell>
                <TableCell>
                  <Input
                    key={`s${e.score}`}
                    type="number"
                    step="0.001"
                    defaultValue={e.score ?? ""}
                    aria-label={`Score for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      num(ev.target.value) !== e.score &&
                      upd.run({ id: e.id, score: num(ev.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    key={`p${e.placing}`}
                    type="number"
                    min="1"
                    defaultValue={e.placing ?? ""}
                    aria-label={`Placing for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      num(ev.target.value) !== e.placing &&
                      upd.run({ id: e.id, placing: num(ev.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    key={`n${e.notes}`}
                    defaultValue={e.notes ?? ""}
                    placeholder="e.g. Fell on skill 7"
                    className="min-w-40"
                    aria-label={`Notes for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      ev.target.value !== (e.notes ?? "") &&
                      upd.run({ id: e.id, notes: ev.target.value })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Results save when you leave each field.
      </p>
    </div>
  )
}
