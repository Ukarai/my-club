// Skill progress. Setting a skill status logs it (with who made the change)
// and auto-achieves matching skill-linked targets.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { MAX, check, id, oneOf, optionalText } from "../check"
import { gymnastName, logActivity, skillName } from "../activity"
import { SKILL_STATUSES, labelFor } from "@/lib/domain"
import { today } from "@/lib/dates"
import { rank } from "./util"

export const setSkillStatus = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        gymnastId: id(),
        skillId: id(),
        status: oneOf(SKILL_STATUSES).nullable(),
        note: optionalText("Note", MAX.text),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const date = today()
    const skill = skillName(d.skillId)
    const log = { gymnastId: d.gymnastId, subject: gymnastName(d.gymnastId) }
    const logChange = (status: string) =>
      run(
        "INSERT INTO skill_history (gymnast_id, skill_id, status, recorded_on, recorded_by, note) VALUES (?, ?, ?, ?, ?, ?)",
        d.gymnastId,
        d.skillId,
        status,
        date,
        user.name,
        d.note
      )
    tx(() => {
      if (d.status === null) {
        const removed = get<{ skill_id: number }>(
          "DELETE FROM gymnast_skills WHERE gymnast_id = ? AND skill_id = ? RETURNING skill_id",
          d.gymnastId,
          d.skillId
        )
        if (removed) {
          logChange("cleared")
          logActivity(user, "skill.status", `cleared ${skill}`, {
            ...log,
            detail: d.note,
          })
        }
        return
      }
      const stage = labelFor(SKILL_STATUSES, d.status)
      run(
        `INSERT INTO gymnast_skills (gymnast_id, skill_id, status, updated_at, updated_by, note) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (gymnast_id, skill_id) DO UPDATE SET status = excluded.status,
           updated_at = excluded.updated_at, updated_by = excluded.updated_by,
           note = coalesce(excluded.note, gymnast_skills.note)`,
        d.gymnastId,
        d.skillId,
        d.status,
        date,
        user.name,
        d.note
      )
      logChange(d.status)
      logActivity(user, "skill.status", `set ${skill} to ${stage}`, {
        ...log,
        detail: d.note,
      })
      // Auto-complete any active skill targets this progress satisfies.
      const targets = all<{
        id: number
        title: string
        goal_status: string | null
      }>(
        "SELECT id, title, goal_status FROM targets WHERE gymnast_id = ? AND skill_id = ? AND status = 'active'",
        d.gymnastId,
        d.skillId
      )
      for (const t of targets) {
        if (t.goal_status && rank(d.status) >= rank(t.goal_status)) {
          run(
            "UPDATE targets SET status = 'achieved', achieved_on = ?, closed_by = ? WHERE id = ?",
            date,
            user.name,
            t.id
          )
          logActivity(
            user,
            "target.achieve",
            `achieved the target “${t.title}”`,
            { ...log, detail: `Automatically, when ${skill} reached ${stage}` }
          )
        }
      }
    })
  })
