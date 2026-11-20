import { useRouter } from "@tanstack/react-router"
import { saveRoutine } from "@/server/functions/competition-routines"
import { EntryStatusBadge } from "@/components/badges"
import { RoutineEditor } from "@/components/competition/routine-editor"
import { FormError } from "@/components/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Entry } from "@/lib/domain"
import { useAction } from "@/lib/use-action"
import { useCan } from "@/lib/use-user"
import type { CompetitionData } from "./data"

/** Admins can always edit routines; coaches can until an admin locks them. */
function useCanEditRoutines(data: CompetitionData) {
  const isAdmin = useCan("admin")
  const isCoach = useCan("coach")
  return isAdmin || (isCoach && !data.competition.routines_locked)
}

export function RoutineCard({
  entry,
  data,
}: {
  entry: Entry
  data: CompetitionData
}) {
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
