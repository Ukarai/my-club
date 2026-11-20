import { useRouter } from "@tanstack/react-router"
import { cn } from "cn"
import { Lock, LockOpen } from "lucide-react"
import { setRoutinesLocked } from "@/server/functions/competition-routines"
import { FormError } from "@/components/form"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/dates"
import { useAction } from "@/lib/use-action"
import { useCan } from "@/lib/use-user"
import type { CompetitionData } from "./data"

export function RoutineLock({ data }: { data: CompetitionData }) {
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
