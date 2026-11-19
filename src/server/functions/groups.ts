// Custom groups of gymnasts and their membership.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { GROUP_COLORS, today } from "@/lib/domain"
import type { Group, GroupSummary, Gymnast } from "@/lib/domain"
import { input, blank } from "./util"

export const listGroups = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<GroupSummary>(
      `SELECT gr.*,
        (SELECT count(*) FROM group_members m JOIN gymnasts g ON g.id = m.gymnast_id
           WHERE m.group_id = gr.id AND g.active = 1) AS member_count
       FROM club_groups gr ORDER BY gr.name`
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
    const group = get<Group>("SELECT * FROM club_groups WHERE id = ?", id)
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
}

export const saveGroup = createServerFn({ method: "POST" })
  .validator(input<GroupInput>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    const name = d.name.trim()
    if (!name) throw new Error("Group needs a name")
    const color = GROUP_COLORS.find((c) => c === d.color) ?? "sky"
    const clash = get<{ id: number }>(
      "SELECT id FROM club_groups WHERE name = ? AND id != ?",
      name,
      d.id ?? 0
    )
    if (clash) throw new Error(`There's already a group called "${name}"`)
    if (d.id) {
      run(
        "UPDATE club_groups SET name = ?, description = ?, color = ? WHERE id = ?",
        name,
        blank(d.description),
        color,
        d.id
      )
      return d.id
    }
    return run(
      "INSERT INTO club_groups (name, description, color) VALUES (?, ?, ?)",
      name,
      blank(d.description),
      color
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
