import { cn } from "cn"
import { AlertTriangle } from "lucide-react"
import { NativeSelect } from "@/components/form"
import { SKILL_STATUSES, labelFor } from "@/lib/domain"
import type { CompetitionData } from "./data"

const READY = new Set(["independent", "in_routine"])

export function RoutineEditor({
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
