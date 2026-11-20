// Competitions themselves. Anyone signed in can view them; changes are
// admin-only.
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
  competitionName,
  logActivity,
} from "../activity"
import { COMPETITION_STATUSES } from "@/lib/domain"
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
