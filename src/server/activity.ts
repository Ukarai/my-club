// The activity log: who did what, and when. Every server function that
// changes something adds a row, so the app can always say who did it.
import { get, run } from "./db"
import type { SessionUser } from "@/lib/domain"

export type ActivityOptions = {
  /** The gymnast, competition or group it was about, as named now. */
  subject?: string | null
  detail?: string | null
  gymnastId?: number | null
  competitionId?: number | null
  groupId?: number | null
}

/**
 * Records that `user` did something. `summary` is read after their name,
 * so it starts with a verb: "added an injury note". It doesn't repeat the
 * subject, which the app shows beside it.
 */
export function logActivity(
  user: Pick<SessionUser, "id" | "name">,
  action: string,
  summary: string,
  o: ActivityOptions = {}
) {
  run(
    `INSERT INTO activity (at, user_id, user_name, action, summary, detail, subject, gymnast_id, competition_id, group_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    new Date().toISOString(),
    user.id,
    user.name,
    action,
    summary,
    o.detail ?? null,
    o.subject ?? null,
    o.gymnastId ?? null,
    o.competitionId ?? null,
    o.groupId ?? null
  )
}

/** A gymnast's full name. Throws when there's no such gymnast. */
export function gymnastName(id: number) {
  const row = get<{ name: string }>(
    "SELECT first_name || ' ' || last_name AS name FROM gymnasts WHERE id = ?",
    id
  )
  if (!row) throw new Error("Gymnast not found")
  return row.name
}

/** A catalogue skill's name. Throws when there's no such skill. */
export function skillName(id: number) {
  const row = get<{ name: string }>("SELECT name FROM skills WHERE id = ?", id)
  if (!row) throw new Error("Skill not found")
  return row.name
}

/** "a", "a and b", "a, b and c". */
export function listPhrase(items: string[]) {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

/**
 * The labels of the fields whose value changed, e.g. ["squad", "level"].
 * Only the fields named in `labels` are compared.
 */
export function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: { [K in keyof T]?: unknown },
  labels: { [K in keyof T]?: string }
) {
  return (Object.keys(labels) as (keyof T)[])
    .filter((k) => k in after && (before[k] ?? null) !== (after[k] ?? null))
    .map((k) => labels[k]!)
}

/** "Changed squad and level", or null when nothing changed. */
export function changedDetail(fields: string[]) {
  return fields.length ? `Changed ${listPhrase(fields)}` : null
}

/** "a"/"an" before a word. */
export const article = (word: string) =>
  /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`
