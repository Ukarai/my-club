// Custom groups of gymnasts.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { MAX, check, id, optionalText, text } from "../check"
import {
  changedDetail,
  changedFields,
  groupSubject,
  logActivity,
} from "../activity"
import { GROUP_COLORS } from "@/lib/domain"
import { hasRole } from "@/lib/roles"
import type {
  CoachOption,
  Group,
  GroupSummary,
  GroupWithCoach,
  Gymnast,
} from "@/lib/domain"

export const listGroups = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<GroupSummary>(
      `SELECT gr.*, u.name AS primary_coach_name,
        (SELECT count(*) FROM group_members m JOIN gymnasts g ON g.id = m.gymnast_id
           WHERE m.group_id = gr.id AND g.active = 1) AS member_count
       FROM club_groups gr LEFT JOIN users u ON u.id = gr.primary_coach_id
       ORDER BY gr.name`
    )
  }
)

/** People an admin can make a group's primary coach. */
export const listCoaches = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("admin")
    return all<CoachOption>(
      "SELECT id, name FROM users WHERE active = 1 AND role IN ('coach', 'admin') ORDER BY name"
    )
  }
)

export type GroupMember = {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  squad: string | null
  level: string | null
  active: number
  added_on: string
  independent_count: number
  active_targets: number
  open_injuries: number
}

export const getGroup = createServerFn({ method: "GET" })
  .validator(check(id("Group not found")))
  .handler(async ({ data: groupId }) => {
    requireRole("viewer")
    const group = get<GroupWithCoach>(
      `SELECT gr.*, u.name AS primary_coach_name
       FROM club_groups gr LEFT JOIN users u ON u.id = gr.primary_coach_id
       WHERE gr.id = ?`,
      groupId
    )
    if (!group) throw new Error("Group not found")
    return {
      group,
      members: all<GroupMember>(
        `SELECT g.id, g.first_name, g.last_name, g.date_of_birth, g.squad, g.level, g.active, m.added_on,
          (SELECT count(*) FROM gymnast_skills x WHERE x.gymnast_id = g.id AND x.status IN ('independent','in_routine')) AS independent_count,
          (SELECT count(*) FROM targets t WHERE t.gymnast_id = g.id AND t.status = 'active') AS active_targets,
          (SELECT count(*) FROM notes n WHERE n.gymnast_id = g.id AND n.category = 'injury' AND n.resolved = 0) AS open_injuries
         FROM group_members m JOIN gymnasts g ON g.id = m.gymnast_id
         WHERE m.group_id = ? ORDER BY g.active DESC, g.last_name, g.first_name`,
        groupId
      ),
      gymnasts: all<Pick<Gymnast, "id" | "first_name" | "last_name" | "squad">>(
        "SELECT id, first_name, last_name, squad FROM gymnasts WHERE active = 1 ORDER BY last_name, first_name"
      ),
    }
  })

const groupInput = z.object({
  id: id().optional(),
  name: text("Name", MAX.name, "Group needs a name"),
  description: optionalText("Description", MAX.description),
  color: z
    .string()
    .pipe(z.enum(GROUP_COLORS))
    .nullish()
    .transform((c) => c ?? "sky"),
  /** Admins only. Leave undefined to keep the current coach. */
  primaryCoachId: id().nullable().optional(),
})

export type GroupInput = z.input<typeof groupInput>

const GROUP_FIELDS = {
  name: "name",
  description: "description",
  color: "colour",
}

export const saveGroup = createServerFn({ method: "POST" })
  .validator(check(groupInput))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const coachId = d.primaryCoachId
    let coachName: string | null = null
    if (coachId !== undefined) {
      if (!hasRole(user, "admin"))
        throw new Error("Only an admin can choose a group's primary coach")
      if (coachId !== null) {
        const coach = get<{ name: string }>(
          "SELECT name FROM users WHERE id = ? AND active = 1 AND role IN ('coach', 'admin')",
          coachId
        )
        if (!coach) throw new Error("Choose an active coach")
        coachName = coach.name
      }
    }
    const clash = get<{ id: number }>(
      "SELECT id FROM club_groups WHERE name = ? AND id != ?",
      d.name,
      d.id ?? 0
    )
    if (clash) throw new Error(`There's already a group called "${d.name}"`)
    return tx(() => {
      if (d.id) {
        const groupId = d.id
        const before = get<Group>(
          "SELECT * FROM club_groups WHERE id = ?",
          groupId
        )
        if (!before) throw new Error("Group not found")
        run(
          "UPDATE club_groups SET name = ?, description = ?, color = ? WHERE id = ?",
          d.name,
          d.description,
          d.color,
          groupId
        )
        const log = { groupId, subject: d.name }
        const changed = changedFields(before, d, GROUP_FIELDS)
        if (changed.length)
          logActivity(user, "group.edit", "edited the group", {
            ...log,
            detail: changedDetail(changed),
          })
        if (coachId !== undefined && coachId !== before.primary_coach_id) {
          run(
            "UPDATE club_groups SET primary_coach_id = ? WHERE id = ?",
            coachId,
            groupId
          )
          logActivity(
            user,
            "group.coach",
            coachName
              ? `made ${coachName} the primary coach`
              : "removed the primary coach",
            log
          )
        }
        return groupId
      }
      const groupId = run(
        "INSERT INTO club_groups (name, description, color, primary_coach_id) VALUES (?, ?, ?, ?)",
        d.name,
        d.description,
        d.color,
        coachId ?? null
      )
      logActivity(user, "group.add", "created the group", {
        groupId,
        subject: d.name,
        detail: coachName ? `Primary coach: ${coachName}` : null,
      })
      return groupId
    })
  })

export const deleteGroup = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: groupId }) => {
    const user = requireRole("coach")
    const subject = groupSubject(groupId)
    tx(() => {
      // Members are only unlinked (ON DELETE CASCADE); gymnasts are untouched.
      run("DELETE FROM club_groups WHERE id = ?", groupId)
      logActivity(user, "group.delete", "deleted the group", { subject })
    })
  })
