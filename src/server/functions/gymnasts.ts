// Gymnast profiles: list, detail page data, create/edit, archive, delete.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { MAX, check, id, optionalDate, optionalText, text } from "../check"
import {
  changedDetail,
  changedFields,
  gymnastName,
  logActivity,
} from "../activity"
import { hasRole } from "@/lib/roles"
import { today } from "@/lib/dates"
import type {
  Activity,
  Group,
  Gymnast,
  GymnastEntry,
  GymnastSkill,
  GymnastSummary,
  Note,
  Skill,
  SkillNote,
  Target,
} from "@/lib/domain"

export const listGymnasts = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    // The list never needs contact or medical details, so they're never sent.
    const rows = all<
      Omit<GymnastSummary, "group_ids"> & { group_list: string | null }
    >(
      `SELECT g.id, g.first_name, g.last_name, g.date_of_birth, g.squad, g.level, g.active,
      g.created_at, NULL AS guardian_contact, NULL AS medical_info,
      (SELECT count(*) FROM gymnast_skills x WHERE x.gymnast_id = g.id AND x.status IN ('independent','in_routine')) AS independent_count,
      (SELECT count(*) FROM gymnast_skills x WHERE x.gymnast_id = g.id AND x.status NOT IN ('independent','in_routine')) AS in_progress_count,
      (SELECT count(*) FROM targets t WHERE t.gymnast_id = g.id AND t.status = 'active') AS active_targets,
      (SELECT count(*) FROM notes n WHERE n.gymnast_id = g.id AND n.category = 'injury' AND n.resolved = 0) AS open_injuries,
      (SELECT group_concat(m.group_id) FROM group_members m WHERE m.gymnast_id = g.id) AS group_list
     FROM gymnasts g ORDER BY g.active DESC, g.last_name, g.first_name`
    )
    return rows.map(({ group_list, ...r }): GymnastSummary => ({
      ...r,
      group_ids: group_list ? group_list.split(",").map(Number) : [],
    }))
  }
)

export const getGymnast = createServerFn({ method: "GET" })
  .validator(check(id("Gymnast not found")))
  .handler(async ({ data: gymnastId }) => {
    const user = requireRole("viewer")
    const gymnast = get<Gymnast>(
      "SELECT * FROM gymnasts WHERE id = ?",
      gymnastId
    )
    if (!gymnast) throw new Error("Gymnast not found")
    // Viewers (e.g. volunteers) don't see personal contact or medical details.
    if (!hasRole(user, "coach")) {
      gymnast.guardian_contact = null
      gymnast.medical_info = null
    }
    return {
      gymnast,
      skills: all<Skill>("SELECT * FROM skills ORDER BY sort_order, name"),
      gymnastSkills: all<GymnastSkill>(
        "SELECT skill_id, status, updated_at, updated_by, note FROM gymnast_skills WHERE gymnast_id = ?",
        gymnastId
      ),
      // Everything done to this gymnast's records, and who did it.
      activity: all<Activity>(
        "SELECT * FROM activity WHERE gymnast_id = ? ORDER BY at DESC, id DESC LIMIT 200",
        gymnastId
      ),
      notes: all<Note>(
        "SELECT * FROM notes WHERE gymnast_id = ? ORDER BY noted_on DESC, id DESC",
        gymnastId
      ),
      skillNotes: all<SkillNote>(
        `SELECT * FROM skill_notes WHERE gymnast_id = ?
         ORDER BY archived, CASE kind WHEN 'focus' THEN 0 ELSE 1 END, noted_on DESC, id DESC`,
        gymnastId
      ),
      targets: all<Target>(
        `SELECT t.*, s.name AS skill_name FROM targets t LEFT JOIN skills s ON s.id = t.skill_id
         WHERE t.gymnast_id = ?
         ORDER BY CASE t.status WHEN 'active' THEN 0 ELSE 1 END, t.target_date IS NULL, t.target_date`,
        gymnastId
      ),
      entries: all<GymnastEntry>(
        `SELECT e.id, e.competition_id, c.name AS competition_name, c.start_date, e.category,
                e.status, e.score, e.placing
         FROM competition_entries e JOIN competitions c ON c.id = e.competition_id
         WHERE e.gymnast_id = ? ORDER BY c.start_date DESC`,
        gymnastId
      ),
      groups: all<Group & { member: number }>(
        `SELECT gr.*, EXISTS (SELECT 1 FROM group_members m WHERE m.group_id = gr.id AND m.gymnast_id = ?) AS member
         FROM club_groups gr ORDER BY gr.name`,
        gymnastId
      ),
    }
  })

const gymnastInput = z.object({
  id: id().optional(),
  first_name: text("First name", MAX.name),
  last_name: text("Last name", MAX.name),
  date_of_birth: optionalDate("Date of birth").refine(
    (d) => !d || d <= today(),
    "Date of birth can't be in the future"
  ),
  squad: optionalText("Squad", MAX.short),
  level: optionalText("Level", MAX.short),
  guardian_contact: optionalText("Contact", MAX.contact),
  medical_info: optionalText("Medical info", MAX.text),
})

export type GymnastInput = z.input<typeof gymnastInput>

// Field names for the log. Values aren't logged, so viewers who can read a
// gymnast's history never see contact or medical details.
const GYMNAST_FIELDS = {
  first_name: "first name",
  last_name: "last name",
  date_of_birth: "date of birth",
  squad: "squad",
  level: "level",
  guardian_contact: "contact details",
  medical_info: "medical info",
}

export const saveGymnast = createServerFn({ method: "POST" })
  .validator(check(gymnastInput))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const vals = [
      d.first_name,
      d.last_name,
      d.date_of_birth,
      d.squad,
      d.level,
      d.guardian_contact,
      d.medical_info,
    ]
    const subject = `${d.first_name} ${d.last_name}`
    return tx(() => {
      if (d.id) {
        const before = get<Gymnast>("SELECT * FROM gymnasts WHERE id = ?", d.id)
        if (!before) throw new Error("Gymnast not found")
        run(
          `UPDATE gymnasts SET first_name=?, last_name=?, date_of_birth=?, squad=?, level=?,
           guardian_contact=?, medical_info=? WHERE id=?`,
          ...vals,
          d.id
        )
        const changed = changedFields(before, d, GYMNAST_FIELDS)
        if (changed.length)
          logActivity(user, "gymnast.edit", "edited the profile", {
            gymnastId: d.id,
            subject,
            detail: changedDetail(changed),
          })
        return d.id
      }
      const newId = run(
        `INSERT INTO gymnasts (first_name, last_name, date_of_birth, squad, level, guardian_contact, medical_info)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ...vals
      )
      logActivity(user, "gymnast.add", "added the gymnast", {
        gymnastId: newId,
        subject,
      })
      return newId
    })
  })

export const setGymnastActive = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), active: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const row = get<{ active: number }>(
      "SELECT active FROM gymnasts WHERE id = ?",
      d.id
    )
    if (!row) throw new Error("Gymnast not found")
    if (Boolean(row.active) === d.active) return
    tx(() => {
      run("UPDATE gymnasts SET active = ? WHERE id = ?", d.active ? 1 : 0, d.id)
      logActivity(
        user,
        d.active ? "gymnast.restore" : "gymnast.archive",
        d.active ? "restored the gymnast" : "archived the gymnast",
        { gymnastId: d.id, subject: gymnastName(d.id) }
      )
    })
  })

export const deleteGymnast = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: gymnastId }) => {
    const user = requireRole("admin")
    const subject = gymnastName(gymnastId)
    tx(() => {
      run("DELETE FROM gymnasts WHERE id = ?", gymnastId)
      // Their own activity goes with them; this record of the deletion stays.
      logActivity(user, "gymnast.delete", "deleted the gymnast", { subject })
    })
  })
