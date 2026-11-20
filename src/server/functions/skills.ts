// The club's skill catalogue (admin-managed).
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get, run, tx } from "../db"
import { MAX, check, id, optionalText, text } from "../check"
import { changedDetail, changedFields, logActivity } from "../activity"
import type { Skill } from "@/lib/domain"

export const listSkills = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<Skill & { tracked: number; independent: number }>(
      `SELECT s.*,
      (SELECT count(*) FROM gymnast_skills x WHERE x.skill_id = s.id) AS tracked,
      (SELECT count(*) FROM gymnast_skills x WHERE x.skill_id = s.id AND x.status IN ('independent','in_routine')) AS independent
     FROM skills s ORDER BY s.sort_order, s.name`
    )
  }
)

const SKILL_FIELDS = {
  name: "name",
  category: "category",
  tariff: "tariff",
  description: "description",
}

export const saveSkill = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id().optional(),
        name: text("Name", MAX.short, "Skill needs a name"),
        category: text("Category", MAX.short),
        tariff: z
          .number({ error: "Tariff must be a number" })
          .min(0, "Tariff can't be negative")
          .max(5, "Tariff must be 5 or less"),
        description: optionalText("Description", MAX.description),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const clash = get(
      "SELECT 1 FROM skills WHERE name = ? COLLATE NOCASE AND id != ?",
      d.name,
      d.id ?? 0
    )
    if (clash) throw new Error(`There's already a skill called "${d.name}"`)
    const vals = [d.name, d.category, d.tariff, d.description]
    return tx(() => {
      if (d.id) {
        const before = get<Skill>("SELECT * FROM skills WHERE id = ?", d.id)
        if (!before) throw new Error("Skill not found")
        run(
          "UPDATE skills SET name=?, category=?, tariff=?, description=? WHERE id=?",
          ...vals,
          d.id
        )
        const changed = changedFields(before, d, SKILL_FIELDS)
        if (changed.length)
          logActivity(user, "catalogue.edit", `edited the skill “${d.name}”`, {
            detail: changedDetail(changed),
          })
        return d.id
      }
      const { m } = get<{ m: number }>(
        "SELECT coalesce(max(sort_order), 0) + 1 AS m FROM skills"
      )!
      const skillId = run(
        "INSERT INTO skills (name, category, tariff, description, sort_order) VALUES (?, ?, ?, ?, ?)",
        ...vals,
        m
      )
      logActivity(
        user,
        "catalogue.add",
        `added the skill “${d.name}” to the catalogue`
      )
      return skillId
    })
  })

export const deleteSkill = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: skillId }) => {
    const user = requireRole("admin")
    const skill = get<{ name: string }>(
      "SELECT name FROM skills WHERE id = ?",
      skillId
    )
    if (!skill) return
    tx(() => {
      run("DELETE FROM skills WHERE id = ?", skillId)
      logActivity(
        user,
        "catalogue.delete",
        `deleted the skill “${skill.name}” from the catalogue`
      )
    })
  })
