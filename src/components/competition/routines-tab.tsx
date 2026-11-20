import { useRouter } from "@tanstack/react-router"
import { AlertTriangle, Lock, LockOpen } from "lucide-react"
import { cn } from "cn"
import { saveRoutine, setRoutinesLocked } from "@/server/functions/competitions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EntryStatusBadge } from "@/components/badges"
import {
  EmptyState,
  FormError,
  NativeSelect,
  useAction,
} from "@/components/form"
import { SKILL_STATUSES, formatDate, labelFor, type Entry } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import type { CompetitionData } from "./data"

const READY = new Set(["independent", "in_routine"])

/** Admins can always edit routines; coaches can until an admin locks them. */
function useCanEditRoutines(data: CompetitionData) {
  const isAdmin = useCan("admin")
  const isCoach = useCan("coach")
  return isAdmin || (isCoach && !data.competition.routines_locked)
}

function RoutineLock({ data }: { data: CompetitionData }) {
  const router = useRouter()
  const isAdmin = useCan("admin")
  const c = data.competition
  const locked = !!c.routines_locked
  const toggle = useAction(async () => {
    await setRoutinesLocked({
      data: { competitionId: c.id, locked: !locked },
    })
    await router.invalidate()
  })

  return (
    <div
      className={cn(
        "surface flex flex-wrap items-center justify-between gap-3 p-3 text-sm",
        locked &&
          "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
      )}
    >
      <div className="flex items-start gap-2">
        {locked ? (
          <Lock className="mt-0.5 size-4 shrink-0 text-amber-600" />
        ) : (
          <LockOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">
            {locked ? "Routines are locked" : "Routines are open for editing"}
          </p>
          <p className="text-muted-foreground">
            {locked
              ? `Only admins can change routine cards${c.routines_locked_by ? ` · locked by ${c.routines_locked_by}` : ""}${c.routines_locked_on ? ` on ${formatDate(c.routines_locked_on)}` : ""}.`
              : "Coaches and admins can change routine cards."}
          </p>
        </div>
      </div>
      {isAdmin && (
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={toggle.pending}
            onClick={() => toggle.run()}
          >
            {locked ? <LockOpen /> : <Lock />}
            {locked ? "Unlock routines" : "Lock routines"}
          </Button>
          <FormError error={toggle.error} />
        </div>
      )}
    </div>
  )
}

export function RoutinesTab({ data }: { data: CompetitionData }) {
  const active = data.entries.filter((e) => e.status !== "withdrawn")
  if (!active.length)
    return (
      <div className="flex flex-col gap-4">
        <RoutineLock data={data} />
        <EmptyState title="Enter gymnasts first to build their routine cards" />
      </div>
    )
  return (
    <div className="flex flex-col gap-4">
      <RoutineLock data={data} />
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

function RoutineCard({ entry, data }: { entry: Entry; data: CompetitionData }) {
  const router = useRouter()
  const canEdit = useCanEditRoutines(data)
  const upd = useAction(
    async (key: "routine1" | "routine2", routine: number[]) => {
      await saveRoutine({ data: { entryId: entry.id, key, routine } })
      await router.invalidate()
    }
  )
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
            onChange={(routine) => upd.run(key, routine)}
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
  skills: CompetitionData["skills"]
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
