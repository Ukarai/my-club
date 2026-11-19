// Competitions, entries, routine cards (with admin locking) and club tasks.
// Everything except routines is admin-only.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { hasRole, today } from "@/lib/domain"
import type {
  CompTask,
  Competition,
  CompetitionSummary,
  Entry,
  Gymnast,
  Skill,
  SkillStatus,
} from "@/lib/domain"
import { input, blank } from "./util"

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
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("viewer")
    const competition = get<Competition>(
      "SELECT * FROM competitions WHERE id = ?",
      id
    )
    if (!competition) throw new Error("Competition not found")
    const entries = all<EntryRow>(
      `SELECT e.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM competition_entries e JOIN gymnasts g ON g.id = e.gymnast_id
       WHERE e.competition_id = ? ORDER BY e.category, g.last_name, g.first_name`,
      id
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
        id
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
        id
      ),
    }
  })

export type CompetitionInput = {
  id?: number
  name: string
  start_date: string
  end_date?: string | null
  venue?: string | null
  organiser?: string | null
  level?: string | null
  entry_deadline?: string | null
  entry_fee?: number | null
  status: string
  notes?: string | null
}

export const saveCompetition = createServerFn({ method: "POST" })
  .validator(input<CompetitionInput>())
  .handler(async ({ data: d }) => {
    requireRole("admin")
    if (!d.name.trim() || !d.start_date)
      throw new Error("Name and start date are required")
    const vals = [
      d.name.trim(),
      d.start_date,
      blank(d.end_date),
      blank(d.venue),
      blank(d.organiser),
      blank(d.level),
      blank(d.entry_deadline),
      d.entry_fee ?? null,
      d.status,
      blank(d.notes),
    ]
    if (d.id) {
      run(
        `UPDATE competitions SET name=?, start_date=?, end_date=?, venue=?, organiser=?, level=?,
         entry_deadline=?, entry_fee=?, status=?, notes=? WHERE id=?`,
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      `INSERT INTO competitions (name, start_date, end_date, venue, organiser, level, entry_deadline, entry_fee, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...vals
    )
  })

export const deleteCompetition = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM competitions WHERE id = ?", id)
  })

export const addEntries = createServerFn({ method: "POST" })
  .validator(
    input<{
      competitionId: number
      gymnastIds: number[]
      category?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("admin")
    tx(() => {
      for (const gid of d.gymnastIds) {
        run(
          `INSERT INTO competition_entries (competition_id, gymnast_id, category) VALUES (?, ?, ?)
           ON CONFLICT DO NOTHING`,
          d.competitionId,
          gid,
          blank(d.category)
        )
      }
    })
  })

export type EntryPatch = {
  id: number
  category?: string | null
  status?: string
  fee_paid?: boolean
  routine1?: number[]
  routine2?: number[]
  score?: number | null
  placing?: number | null
  notes?: string | null
}

export const updateEntry = createServerFn({ method: "POST" })
  .validator(input<EntryPatch>())
  .handler(async ({ data: d }) => {
    requireRole("admin")
    const sets: string[] = []
    const vals: (string | number | null)[] = []
    const set = (col: string, v: string | number | null) => {
      sets.push(`${col} = ?`)
      vals.push(v)
    }
    if ("category" in d) set("category", blank(d.category))
    if (d.status) set("status", d.status)
    if ("fee_paid" in d) set("fee_paid", d.fee_paid ? 1 : 0)
    if (d.routine1) set("routine1", JSON.stringify(d.routine1.slice(0, 10)))
    if (d.routine2) set("routine2", JSON.stringify(d.routine2.slice(0, 10)))
    if ("score" in d) set("score", d.score ?? null)
    if ("placing" in d) set("placing", d.placing ?? null)
    if ("notes" in d) set("notes", blank(d.notes))
    if (!sets.length) return
    run(
      `UPDATE competition_entries SET ${sets.join(", ")} WHERE id = ?`,
      ...vals,
      d.id
    )
  })

/**
 * Routine cards are the one part of a competition coaches can edit, unless
 * an admin has locked them (e.g. once routine cards have been submitted).
 */
export const saveRoutine = createServerFn({ method: "POST" })
  .validator(
    input<{
      entryId: number
      key: "routine1" | "routine2"
      routine: number[]
    }>()
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    if (!["routine1", "routine2"].includes(d.key))
      throw new Error("Unknown routine")
    const row = get<{ routines_locked: number }>(
      `SELECT c.routines_locked FROM competition_entries e
       JOIN competitions c ON c.id = e.competition_id WHERE e.id = ?`,
      d.entryId
    )
    if (!row) throw new Error("Entry not found")
    if (row.routines_locked && !hasRole(user, "admin"))
      throw new Error(
        "Routines for this competition are locked. Ask an admin to unlock them."
      )
    const routine = d.routine
      .slice(0, 10)
      .map((n) => (Number.isInteger(n) && n > 0 ? n : 0))
    run(
      `UPDATE competition_entries SET ${d.key} = ? WHERE id = ?`,
      JSON.stringify(routine),
      d.entryId
    )
  })

export const setRoutinesLocked = createServerFn({ method: "POST" })
  .validator(input<{ competitionId: number; locked: boolean }>())
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    run(
      `UPDATE competitions SET routines_locked = ?, routines_locked_by = ?, routines_locked_on = ?
       WHERE id = ?`,
      d.locked ? 1 : 0,
      d.locked ? user.name : null,
      d.locked ? today() : null,
      d.competitionId
    )
  })

export const removeEntry = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM competition_entries WHERE id = ?", id)
  })

export const saveTask = createServerFn({ method: "POST" })
  .validator(
    input<{
      competitionId: number
      title: string
      due_date?: string | null
      assignee?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("admin")
    if (!d.title.trim()) throw new Error("Task needs a title")
    return run(
      "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
      d.competitionId,
      d.title.trim(),
      blank(d.due_date),
      blank(d.assignee)
    )
  })

export const setTaskDone = createServerFn({ method: "POST" })
  .validator(input<{ id: number; done: boolean }>())
  .handler(async ({ data }) => {
    requireRole("admin")
    run(
      "UPDATE competition_tasks SET done = ? WHERE id = ?",
      data.done ? 1 : 0,
      data.id
    )
  })

export const deleteTask = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM competition_tasks WHERE id = ?", id)
  })
