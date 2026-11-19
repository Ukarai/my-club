// Skill progress and targets. Setting a skill status logs it (with who made the
// change) and auto-achieves matching skill-linked targets.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { today } from "@/lib/domain"
import type { SkillStatus } from "@/lib/domain"
import { input, blank, rank } from "./util"

export const setSkillStatus = createServerFn({ method: "POST" })
  .validator(
    input<{
      gymnastId: number
      skillId: number
      status: SkillStatus | null
      note?: string | null
      date?: string
    }>()
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const date = d.date || today()
    const note = blank(d.note)
    const logChange = (status: string) =>
      run(
        "INSERT INTO skill_history (gymnast_id, skill_id, status, recorded_on, recorded_by, note) VALUES (?, ?, ?, ?, ?, ?)",
        d.gymnastId,
        d.skillId,
        status,
        date,
        user.name,
        note
      )
    tx(() => {
      if (d.status === null) {
        const removed = get<{ skill_id: number }>(
          "DELETE FROM gymnast_skills WHERE gymnast_id = ? AND skill_id = ? RETURNING skill_id",
          d.gymnastId,
          d.skillId
        )
        if (removed) logChange("cleared")
        return
      }
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
        note
      )
      logChange(d.status)
      // Auto-complete any active skill targets this progress satisfies.
      const targets = all<{ id: number; goal_status: string | null }>(
        "SELECT id, goal_status FROM targets WHERE gymnast_id = ? AND skill_id = ? AND status = 'active'",
        d.gymnastId,
        d.skillId
      )
      for (const t of targets) {
        if (t.goal_status && rank(d.status) >= rank(t.goal_status)) {
          run(
            "UPDATE targets SET status = 'achieved', achieved_on = ? WHERE id = ?",
            date,
            t.id
          )
        }
      }
    })
  })

// ───────────────────────────── Targets ─────────────────────────────

export const saveTarget = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      title: string
      details?: string | null
      skill_id?: number | null
      goal_status?: string | null
      target_date?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.title.trim()) throw new Error("Target needs a title")
    const vals = [
      d.title.trim(),
      blank(d.details),
      d.skill_id || null,
      d.skill_id ? blank(d.goal_status) : null,
      blank(d.target_date),
    ]
    if (d.id) {
      run(
        "UPDATE targets SET title=?, details=?, skill_id=?, goal_status=?, target_date=? WHERE id=?",
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      "INSERT INTO targets (gymnast_id, title, details, skill_id, goal_status, target_date) VALUES (?, ?, ?, ?, ?, ?)",
      d.gymnastId,
      ...vals
    )
  })

export const setTargetStatus = createServerFn({ method: "POST" })
  .validator(input<{ id: number; status: string }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE targets SET status = ?, achieved_on = ? WHERE id = ?",
      data.status,
      data.status === "achieved" ? today() : null,
      data.id
    )
  })

export const deleteTarget = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM targets WHERE id = ?", id)
  })
