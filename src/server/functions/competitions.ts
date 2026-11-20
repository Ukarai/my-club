// Competitions, entries, routine cards (with admin locking) and club tasks.
// Everything except routines is admin-only.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import {
  MAX,
  check,
  date,
  id,
  oneOf,
  optionalDate,
  optionalText,
  text,
} from "../check"
import {
  changedDetail,
  changedFields,
  gymnastName,
  logActivity,
} from "../activity"
import {
  COMPETITION_STATUSES,
  ENTRY_STATUSES,
  hasRole,
  labelFor,
  today,
} from "@/lib/domain"
import type {
  CompTask,
  Competition,
  CompetitionSummary,
  Entry,
  Gymnast,
  Skill,
  SkillStatus,
} from "@/lib/domain"

export const listCompetitions = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<CompetitionSummary>(
      `SELECT c.*,
      (SELECT count(*) FROM competition_entries e WHERE e.competition_id = c.id AND e.status != 'withdrawn') AS entry_count,
      (SELECT count(*) FROM competition_tasks k WHERE k.competition_id = c.id AND k.done = 0) AS open_tasks
     FROM competitions c ORDER BY c.start_date DESC`
    )
  }
)

type EntryRow = Omit<Entry, "routine1" | "routine2"> & {
  routine1: string
  routine2: string
}

export const getCompetition = createServerFn({ method: "GET" })
  .validator(check(id("Competition not found")))
  .handler(async ({ data: competitionId }) => {
    requireRole("viewer")
    const competition = get<Competition>(
      "SELECT * FROM competitions WHERE id = ?",
      competitionId
    )
    if (!competition) throw new Error("Competition not found")
    const entries = all<EntryRow>(
      `SELECT e.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM competition_entries e JOIN gymnasts g ON g.id = e.gymnast_id
       WHERE e.competition_id = ? ORDER BY e.category, g.last_name, g.first_name`,
      competitionId
    ).map((e): Entry => ({
      ...e,
      routine1: JSON.parse(e.routine1),
      routine2: JSON.parse(e.routine2),
    }))
    return {
      competition,
      entries,
      tasks: all<CompTask>(
        "SELECT * FROM competition_tasks WHERE competition_id = ? ORDER BY done, due_date IS NULL, due_date, id",
        competitionId
      ),
      gymnasts: all<Pick<Gymnast, "id" | "first_name" | "last_name" | "squad">>(
        "SELECT id, first_name, last_name, squad FROM gymnasts WHERE active = 1 ORDER BY last_name, first_name"
      ),
      skills: all<Skill>("SELECT * FROM skills ORDER BY sort_order, name"),
      // Skills each entered gymnast can do independently or better, for routine building.
      readySkills: all<{
        gymnast_id: number
        skill_id: number
        status: SkillStatus
      }>(
        `SELECT x.gymnast_id, x.skill_id, x.status FROM gymnast_skills x
         JOIN competition_entries e ON e.gymnast_id = x.gymnast_id AND e.competition_id = ?`,
        competitionId
      ),
    }
  })

/** A competition's name. Throws when there's no such competition. */
function competitionName(competitionId: number) {
  const c = get<{ name: string }>(
    "SELECT name FROM competitions WHERE id = ?",
    competitionId
  )
  if (!c) throw new Error("Competition not found")
  return c.name
}

const competitionInput = z
  .object({
    id: id().optional(),
    name: text("Name", MAX.title),
    start_date: date("Start date"),
    end_date: optionalDate("End date"),
    venue: optionalText("Venue", MAX.title),
    organiser: optionalText("Organiser", MAX.title),
    level: optionalText("Level", MAX.short),
    entry_deadline: optionalDate("Entry deadline"),
    entry_fee: z
      .number({ error: "Entry fee must be a number" })
      .min(0, "Entry fee can't be negative")
      .max(10_000, "Entry fee must be £10,000 or less")
      .nullish()
      .transform((v) => v ?? null),
    status: oneOf(COMPETITION_STATUSES),
    notes: optionalText("Notes", MAX.text),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "The end date can't be before the start date",
  })
export type CompetitionInput = z.input<typeof competitionInput>

const COMPETITION_FIELDS = {
  name: "name",
  start_date: "start date",
  end_date: "end date",
  venue: "venue",
  organiser: "organiser",
  level: "level",
  entry_deadline: "entry deadline",
  entry_fee: "entry fee",
  status: "status",
  notes: "notes",
}

export const saveCompetition = createServerFn({ method: "POST" })
  .validator(check(competitionInput))
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const vals = [
      d.name,
      d.start_date,
      d.end_date,
      d.venue,
      d.organiser,
      d.level,
      d.entry_deadline,
      d.entry_fee,
      d.status,
      d.notes,
    ]
    return tx(() => {
      if (d.id) {
        const before = get<Competition>(
          "SELECT * FROM competitions WHERE id = ?",
          d.id
        )
        if (!before) throw new Error("Competition not found")
        run(
          `UPDATE competitions SET name=?, start_date=?, end_date=?, venue=?, organiser=?, level=?,
           entry_deadline=?, entry_fee=?, status=?, notes=? WHERE id=?`,
          ...vals,
          d.id
        )
        const changed = changedFields(before, d, COMPETITION_FIELDS)
        if (changed.length)
          logActivity(user, "competition.edit", "edited the competition", {
            competitionId: d.id,
            subject: d.name,
            detail: changedDetail(changed),
          })
        return d.id
      }
      const competitionId = run(
        `INSERT INTO competitions (name, start_date, end_date, venue, organiser, level, entry_deadline, entry_fee, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...vals
      )
      logActivity(user, "competition.add", "created the competition", {
        competitionId,
        subject: d.name,
      })
      return competitionId
    })
  })

export const deleteCompetition = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: competitionId }) => {
    const user = requireRole("admin")
    const subject = competitionName(competitionId)
    tx(() => {
      run("DELETE FROM competitions WHERE id = ?", competitionId)
      logActivity(user, "competition.delete", "deleted the competition", {
        subject,
      })
    })
  })

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

type EntryInfo = {
  competition_id: number
  competition_name: string
  gymnast_id: number
  gymnast_name: string
}

/** The entry's raw row plus the names the log needs. */
function findEntry<T = unknown>(entryId: number) {
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

const entryLog = (e: EntryInfo) => ({
  gymnastId: e.gymnast_id,
  competitionId: e.competition_id,
  subject: e.gymnast_name,
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

// ───────────────────────────── Tasks ─────────────────────────────

export const saveTask = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        competitionId: id(),
        title: text("Task", MAX.title, "Task needs a title"),
        due_date: optionalDate("Due date"),
        assignee: optionalText("Assignee", MAX.name),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const subject = competitionName(d.competitionId)
    return tx(() => {
      const taskId = run(
        "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
        d.competitionId,
        d.title,
        d.due_date,
        d.assignee
      )
      logActivity(user, "task.add", `added the task “${d.title}”`, {
        competitionId: d.competitionId,
        subject,
        detail: d.assignee ? `For ${d.assignee}` : null,
      })
      return taskId
    })
  })

type TaskInfo = {
  competition_id: number
  competition_name: string
  title: string
  done: number
}

function findTask(taskId: number) {
  const t = get<TaskInfo>(
    `SELECT k.competition_id, c.name AS competition_name, k.title, k.done
     FROM competition_tasks k JOIN competitions c ON c.id = k.competition_id
     WHERE k.id = ?`,
    taskId
  )
  if (!t) throw new Error("Task not found")
  return t
}

const taskLog = (t: TaskInfo) => ({
  competitionId: t.competition_id,
  subject: t.competition_name,
})

export const setTaskDone = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), done: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const t = findTask(d.id)
    if (Boolean(t.done) === d.done) return
    tx(() => {
      run(
        "UPDATE competition_tasks SET done = ? WHERE id = ?",
        d.done ? 1 : 0,
        d.id
      )
      logActivity(
        user,
        d.done ? "task.done" : "task.reopen",
        d.done
          ? `completed the task “${t.title}”`
          : `reopened the task “${t.title}”`,
        taskLog(t)
      )
    })
  })

export const deleteTask = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: taskId }) => {
    const user = requireRole("admin")
    const t = findTask(taskId)
    tx(() => {
      run("DELETE FROM competition_tasks WHERE id = ?", taskId)
      logActivity(
        user,
        "task.delete",
        `deleted the task “${t.title}”`,
        taskLog(t)
      )
    })
  })
