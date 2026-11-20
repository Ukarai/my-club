// Routine cards for each entry. Coaches can edit them until an admin locks them.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { logActivity } from "../activity"
import { requireRole } from "../auth"
import { check, id } from "../check"
import { get, run, tx } from "../db"
import { entryLog, findEntry } from "../entries"
import { today } from "@/lib/dates"
import { hasRole } from "@/lib/roles"

/**
 * Routine cards are the one part of a competition coaches can edit, unless
 * an admin has locked them (e.g. once routine cards have been submitted).
 */
export const saveRoutine = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        entryId: id(),
        key: z.enum(["routine1", "routine2"]),
        // Skill ids, with 0 for an empty slot.
        routine: z.array(z.number().int().min(0)).max(10),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const e = findEntry<{
      routines_locked: number
      routine1: string
      routine2: string
    }>(d.entryId)
    if (e.routines_locked && !hasRole(user, "admin"))
      throw new Error(
        "Routines for this competition are locked. Ask an admin to unlock them."
      )
    const skillIds = [...new Set(d.routine.filter((n) => n > 0))]
    if (skillIds.length) {
      const found = get<{ n: number }>(
        `SELECT count(*) AS n FROM skills WHERE id IN (${skillIds.map(() => "?").join(", ")})`,
        ...skillIds
      )!
      if (found.n !== skillIds.length)
        throw new Error(
          "A skill in this routine is no longer in the catalogue. Refresh the page and try again."
        )
    }
    const routine = JSON.stringify(d.routine)
    if (routine === e[d.key]) return
    tx(() => {
      run(
        `UPDATE competition_entries SET ${d.key} = ? WHERE id = ?`,
        routine,
        d.entryId
      )
      logActivity(
        user,
        "entry.routine",
        `updated their ${d.key === "routine1" ? "first" : "second"} routine for ${e.competition_name}`,
        entryLog(e)
      )
    })
  })

export const setRoutinesLocked = createServerFn({ method: "POST" })
  .validator(check(z.object({ competitionId: id(), locked: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const c = get<{ name: string; routines_locked: number }>(
      "SELECT name, routines_locked FROM competitions WHERE id = ?",
      d.competitionId
    )
    if (!c) throw new Error("Competition not found")
    if (Boolean(c.routines_locked) === d.locked) return
    tx(() => {
      run(
        `UPDATE competitions SET routines_locked = ?, routines_locked_by = ?, routines_locked_on = ?
         WHERE id = ?`,
        d.locked ? 1 : 0,
        d.locked ? user.name : null,
        d.locked ? today() : null,
        d.competitionId
      )
      logActivity(
        user,
        d.locked ? "competition.lock" : "competition.unlock",
        d.locked ? "locked the routine cards" : "unlocked the routine cards",
        { competitionId: d.competitionId, subject: c.name }
      )
    })
  })
