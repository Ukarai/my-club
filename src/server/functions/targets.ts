// A gymnast's targets, which can be linked to a skill.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { gymnastName, logActivity, skillName } from "../activity"
import { requireRole } from "../auth"
import {
  MAX,
  check,
  id,
  oneOf,
  optionalDate,
  optionalText,
  text,
} from "../check"
import { get, run, tx } from "../db"
import { today } from "@/lib/dates"
import { SKILL_STATUSES, TARGET_STATUSES } from "@/lib/domain"

export const saveTarget = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id().optional(),
        gymnastId: id(),
        title: text("Title", MAX.title, "Target needs a title"),
        details: optionalText("Details", MAX.text),
        skill_id: id().nullish(),
        goal_status: oneOf(SKILL_STATUSES).nullish(),
        target_date: optionalDate("Target date"),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const log = { gymnastId: d.gymnastId, subject: gymnastName(d.gymnastId) }
    if (d.skill_id) {
      skillName(d.skill_id) // must exist
      if (!d.goal_status) throw new Error("Choose the stage to reach")
    }
    const vals = [
      d.title,
      d.details,
      d.skill_id ?? null,
      d.skill_id ? (d.goal_status ?? null) : null,
      d.target_date,
    ]
    return tx(() => {
      if (d.id) {
        const updated = get(
          "UPDATE targets SET title=?, details=?, skill_id=?, goal_status=?, target_date=? WHERE id=? AND gymnast_id=? RETURNING id",
          ...vals,
          d.id,
          d.gymnastId
        )
        if (!updated) throw new Error("Target not found")
        logActivity(user, "target.edit", `edited the target “${d.title}”`, log)
        return d.id
      }
      const targetId = run(
        "INSERT INTO targets (gymnast_id, title, details, skill_id, goal_status, target_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        d.gymnastId,
        ...vals,
        user.name
      )
      logActivity(user, "target.add", `set the target “${d.title}”`, log)
      return targetId
    })
  })

type TargetRow = { gymnast_id: number; title: string; status: string }

function findTarget(targetId: number) {
  const t = get<TargetRow>(
    "SELECT gymnast_id, title, status FROM targets WHERE id = ?",
    targetId
  )
  if (!t) throw new Error("Target not found")
  return t
}

export const setTargetStatus = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), status: oneOf(TARGET_STATUSES) })))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const t = findTarget(d.id)
    if (t.status === d.status) return
    const [action, summary] = {
      achieved: ["target.achieve", `marked the target “${t.title}” achieved`],
      dropped: ["target.drop", `dropped the target “${t.title}”`],
      active: ["target.reopen", `reopened the target “${t.title}”`],
    }[d.status]
    tx(() => {
      run(
        "UPDATE targets SET status = ?, achieved_on = ?, closed_by = ? WHERE id = ?",
        d.status,
        d.status === "achieved" ? today() : null,
        d.status === "active" ? null : user.name,
        d.id
      )
      logActivity(user, action, summary, {
        gymnastId: t.gymnast_id,
        subject: gymnastName(t.gymnast_id),
      })
    })
  })

export const deleteTarget = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: targetId }) => {
    const user = requireRole("coach")
    const t = findTarget(targetId)
    tx(() => {
      run("DELETE FROM targets WHERE id = ?", targetId)
      logActivity(user, "target.delete", `deleted the target “${t.title}”`, {
        gymnastId: t.gymnast_id,
        subject: gymnastName(t.gymnast_id),
      })
    })
  })
