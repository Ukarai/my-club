import { EmptyState } from "@/components/empty-state"
import type { CompetitionData } from "./data"
import { RoutineCard } from "@/components/competition/routine-card"
import { RoutineLock } from "@/components/competition/routine-lock"

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
