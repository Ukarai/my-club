// Gymnasts entered in a competition, and each entry's details. Admin-only.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { competitionName, gymnastName, logActivity } from "../activity"
import { requireRole } from "../auth"
import { MAX, check, id, oneOf, optionalText } from "../check"
import { get, run, tx } from "../db"
import { entryLog, findEntry } from "../entries"
import { ENTRY_STATUSES, type Entry, labelFor } from "@/lib/domain"

export const addEntries = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        competitionId: id(),
        gymnastIds: z.array(id()).max(500),
        category: optionalText("Category", MAX.short),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const competition = competitionName(d.competitionId)
    tx(() => {
      for (const gymnastId of d.gymnastIds) {
        const subject = gymnastName(gymnastId)
        const added = get(
          `INSERT INTO competition_entries (competition_id, gymnast_id, category) VALUES (?, ?, ?)
           ON CONFLICT DO NOTHING RETURNING id`,
          d.competitionId,
          gymnastId,
          d.category
        )
        if (added)
          logActivity(user, "entry.add", `entered them in ${competition}`, {
            gymnastId,
            competitionId: d.competitionId,
            subject,
            detail: d.category ? `Category: ${d.category}` : null,
          })
      }
    })
  })

const entryPatch = z.object({
  id: id(),
  category: optionalText("Category", MAX.short).optional(),
  status: oneOf(ENTRY_STATUSES).optional(),
  fee_paid: z.boolean().optional(),
  score: z
    .number({ error: "Score must be a number" })
    .min(0, "Score can't be negative")
    .max(1000, "Score must be 1,000 or less")
    .nullable()
    .optional(),
  placing: z
    .number({ error: "Placing must be a number" })
    .int("Placing must be a whole number")
    .min(1, "Placing must be 1 or more")
    .max(1000, "Placing must be 1,000 or less")
    .nullable()
    .optional(),
  notes: optionalText("Notes", MAX.text).optional(),
})

export type EntryPatch = z.input<typeof entryPatch>

export const updateEntry = createServerFn({ method: "POST" })
  .validator(check(entryPatch))
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    type Row = Pick<
      Entry,
      "category" | "status" | "fee_paid" | "score" | "placing" | "notes"
    >
    const before = findEntry<Row>(d.id)
    const sets: string[] = []
    const vals: (string | number | null)[] = []
    const changes: string[] = []
    const set = (
      col: keyof Row,
      v: string | number | null,
      describe: string
    ) => {
      if ((before[col] ?? null) === v) return
      sets.push(`${col} = ?`)
      vals.push(v)
      changes.push(describe)
    }
    if (d.category !== undefined)
      set("category", d.category, `Category: ${d.category ?? "none"}`)
    if (d.status !== undefined)
      set("status", d.status, `Status: ${labelFor(ENTRY_STATUSES, d.status)}`)
    if (d.fee_paid !== undefined)
      set(
        "fee_paid",
        d.fee_paid ? 1 : 0,
        d.fee_paid ? "Fee: paid" : "Fee: not paid"
      )
    if (d.score !== undefined)
      set("score", d.score, `Score: ${d.score ?? "cleared"}`)
    if (d.placing !== undefined)
      set("placing", d.placing, `Placing: ${d.placing ?? "cleared"}`)
    if (d.notes !== undefined)
      set("notes", d.notes, d.notes ? "Notes changed" : "Notes cleared")
    if (!sets.length) return
    tx(() => {
      run(
        `UPDATE competition_entries SET ${sets.join(", ")} WHERE id = ?`,
        ...vals,
        d.id
      )
      logActivity(
        user,
        "entry.edit",
        `updated their entry for ${before.competition_name}`,
        { ...entryLog(before), detail: changes.join(" · ") }
      )
    })
  })

export const removeEntry = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: entryId }) => {
    const user = requireRole("admin")
    const e = findEntry(entryId)
    tx(() => {
      run("DELETE FROM competition_entries WHERE id = ?", entryId)
      logActivity(
        user,
        "entry.remove",
        `removed them from ${e.competition_name}`,
        entryLog(e)
      )
    })
  })
