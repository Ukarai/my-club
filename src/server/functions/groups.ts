// Custom groups of gymnasts and their membership.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { GROUP_COLORS, hasRole, today } from "@/lib/domain"
import type {
  CoachOption,
  GroupSummary,
  GroupWithCoach,
  Gymnast,
} from "@/lib/domain"
import { input, blank } from "./util"

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
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("viewer")
    const group = get<GroupWithCoach>(
      `SELECT gr.*, u.name AS primary_coach_name
       FROM club_groups gr LEFT JOIN users u ON u.id = gr.primary_coach_id
       WHERE gr.id = ?`,
      id
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
        id
      ),
      gymnasts: all<Pick<Gymnast, "id" | "first_name" | "last_name" | "squad">>(
        "SELECT id, first_name, last_name, squad FROM gymnasts WHERE active = 1 ORDER BY last_name, first_name"
      ),
    }
  })

export type GroupInput = {
  id?: number
  name: string
  description?: string | null
  color?: string | null
  /** Admins only. Leave undefined to keep the current coach. */
  primaryCoachId?: number | null
}

export const saveGroup = createServerFn({ method: "POST" })
  .validator(input<GroupInput>())
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const name = d.name.trim()
    if (!name) throw new Error("Group needs a name")
    const coachId = d.primaryCoachId
    if (coachId !== undefined) {
      if (!hasRole(user, "admin"))
        throw new Error("Only an admin can choose a group's primary coach")
      if (
        coachId !== null &&
        !get(
          "SELECT 1 FROM users WHERE id = ? AND active = 1 AND role IN ('coach', 'admin')",
          coachId
        )
      )
        throw new Error("Choose an active coach")
    }
    const color = GROUP_COLORS.find((c) => c === d.color) ?? "sky"
    const clash = get<{ id: number }>(
      "SELECT id FROM club_groups WHERE name = ? AND id != ?",
      name,
      d.id ?? 0
    )
    if (clash) throw new Error(`There's already a group called "${name}"`)
    if (d.id) {
      const id = d.id
      tx(() => {
        run(
          "UPDATE club_groups SET name = ?, description = ?, color = ? WHERE id = ?",
          name,
          blank(d.description),
          color,
          id
        )
        if (coachId !== undefined)
          run(
            "UPDATE club_groups SET primary_coach_id = ? WHERE id = ?",
            coachId,
            id
          )
      })
      return id
    }
    return run(
      "INSERT INTO club_groups (name, description, color, primary_coach_id) VALUES (?, ?, ?, ?)",
      name,
      blank(d.description),
      color,
      coachId ?? null
    )
  })

export const deleteGroup = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    // Members are only unlinked (ON DELETE CASCADE); gymnasts are untouched.
    run("DELETE FROM club_groups WHERE id = ?", id)
  })

export const addGroupMembers = createServerFn({ method: "POST" })
  .validator(input<{ groupId: number; gymnastIds: number[] }>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    const t = today()
    tx(() => {
      for (const gid of d.gymnastIds)
        run(
          "INSERT INTO group_members (group_id, gymnast_id, added_on) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
          d.groupId,
          gid,
          t
        )
    })
  })

export const removeGroupMember = createServerFn({ method: "POST" })
  .validator(input<{ groupId: number; gymnastId: number }>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    run(
      "DELETE FROM group_members WHERE group_id = ? AND gymnast_id = ?",
      d.groupId,
      d.gymnastId
    )
  })
