// Loader data for the competition page, plus helpers its tabs share.
import { useRouter } from "@tanstack/react-router"
import { useAction } from "@/components/form"
import { updateEntry } from "@/server/functions/competitions"
import type {
  EntryPatch,
  getCompetition,
} from "@/server/functions/competitions"

export type CompetitionData = Awaited<ReturnType<typeof getCompetition>>

/** Save a partial entry update and refresh the page data. */
export function useEntryUpdate() {
  const router = useRouter()
  return useAction(async (patch: EntryPatch) => {
    await updateEntry({ data: patch })
    await router.invalidate()
  })
}
