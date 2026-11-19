// Gymnast profiles: list, detail page data, create/edit, archive, delete.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run } from "../db"
import { hasRole } from "@/lib/domain"
import type {
  Group,
  Gymnast,
  GymnastEntry,
  GymnastSkill,
  GymnastSummary,
  Note,
  SkillNote,
  Skill,
  SkillHistory,
  Target,
} from "@/lib/domain"
import { input, blank } from "./util"

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
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    const user = requireRole("viewer")
    const gymnast = get<Gymnast>("SELECT * FROM gymnasts WHERE id = ?", id)
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
        id
      ),
      history: all<SkillHistory>(
        `SELECT h.*, s.name AS skill_name FROM skill_history h JOIN skills s ON s.id = h.skill_id
         WHERE h.gymnast_id = ? ORDER BY h.recorded_on DESC, h.id DESC LIMIT 50`,
        id
      ),
      notes: all<Note>(
        "SELECT * FROM notes WHERE gymnast_id = ? ORDER BY noted_on DESC, id DESC",
        id
      ),
      skillNotes: all<SkillNote>(
        `SELECT * FROM skill_notes WHERE gymnast_id = ?
         ORDER BY archived, CASE kind WHEN 'focus' THEN 0 ELSE 1 END, noted_on DESC, id DESC`,
        id
      ),
      targets: all<Target>(
        `SELECT t.*, s.name AS skill_name FROM targets t LEFT JOIN skills s ON s.id = t.skill_id
         WHERE t.gymnast_id = ?
         ORDER BY CASE t.status WHEN 'active' THEN 0 ELSE 1 END, t.target_date IS NULL, t.target_date`,
        id
      ),
      entries: all<GymnastEntry>(
        `SELECT e.id, e.competition_id, c.name AS competition_name, c.start_date, e.category,
                e.status, e.score, e.placing
         FROM competition_entries e JOIN competitions c ON c.id = e.competition_id
         WHERE e.gymnast_id = ? ORDER BY c.start_date DESC`,
        id
      ),
      groups: all<Group & { member: number }>(
        `SELECT gr.*, EXISTS (SELECT 1 FROM group_members m WHERE m.group_id = gr.id AND m.gymnast_id = ?) AS member
         FROM club_groups gr ORDER BY gr.name`,
        id
      ),
    }
  })

export type GymnastInput = {
  id?: number
  first_name: string
  last_name: string
  date_of_birth?: string | null
  squad?: string | null
  level?: string | null
  guardian_contact?: string | null
  medical_info?: string | null
}

export const saveGymnast = createServerFn({ method: "POST" })
  .validator(input<GymnastInput>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.first_name.trim() || !d.last_name.trim())
      throw new Error("Name is required")
    const vals = [
      d.first_name.trim(),
      d.last_name.trim(),
      blank(d.date_of_birth),
      blank(d.squad),
      blank(d.level),
      blank(d.guardian_contact),
      blank(d.medical_info),
    ]
    if (d.id) {
      run(
        `UPDATE gymnasts SET first_name=?, last_name=?, date_of_birth=?, squad=?, level=?,
         guardian_contact=?, medical_info=? WHERE id=?`,
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      `INSERT INTO gymnasts (first_name, last_name, date_of_birth, squad, level, guardian_contact, medical_info)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ...vals
    )
  })

export const setGymnastActive = createServerFn({ method: "POST" })
  .validator(input<{ id: number; active: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE gymnasts SET active = ? WHERE id = ?",
      data.active ? 1 : 0,
      data.id
    )
  })

export const deleteGymnast = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM gymnasts WHERE id = ?", id)
  })
