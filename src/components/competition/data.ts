// Loader data for the competition page, plus helpers its tabs share.
import { useRouter } from "@tanstack/react-router"
import { useAction } from "@/lib/use-action"
import { updateEntry } from "@/server/functions/competition-entries"
import type { getCompetition } from "@/server/functions/competitions"
import type { EntryPatch } from "@/server/functions/competition-entries"

export type CompetitionData = Awaited<ReturnType<typeof getCompetition>>

/** Save a partial entry update and refresh the page data. */
export function useEntryUpdate() {
  const router = useRouter()
  return useAction(async (patch: EntryPatch) => {
    await updateEntry({ data: patch })
    await router.invalidate()
  })
}
