// A competition entry with the names its activity-log rows need. Shared by
// the entry and routine server functions.
import { get } from "./db"

type EntryInfo = {
  competition_id: number
  competition_name: string
  gymnast_id: number
  gymnast_name: string
}

/** The entry's raw row plus the names the log needs. */
export function findEntry<T = unknown>(entryId: number) {
  const e = get<EntryInfo & T>(
    `SELECT e.*, c.name AS competition_name, c.routines_locked,
            g.first_name || ' ' || g.last_name AS gymnast_name
     FROM competition_entries e
     JOIN competitions c ON c.id = e.competition_id
     JOIN gymnasts g ON g.id = e.gymnast_id
     WHERE e.id = ?`,
    entryId
  )
  if (!e) throw new Error("Entry not found")
  return e
}

export const entryLog = (e: EntryInfo) => ({
  gymnastId: e.gymnast_id,
  competitionId: e.competition_id,
  subject: e.gymnast_name,
})
