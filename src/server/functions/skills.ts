// The club's skill catalogue (admin-managed).
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get, run } from "../db"
import type { Skill } from "@/lib/domain"
import { input, blank } from "./util"

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

export const saveSkill = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      name: string
      category: string
      tariff: number
      description?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("admin")
    if (!d.name.trim()) throw new Error("Skill needs a name")
    const tariff = Number.isFinite(d.tariff) ? d.tariff : 0
    if (d.id) {
      run(
        "UPDATE skills SET name=?, category=?, tariff=?, description=? WHERE id=?",
        d.name.trim(),
        d.category,
        tariff,
        blank(d.description),
        d.id
      )
      return d.id
    }
    const { m } = get<{ m: number }>(
      "SELECT coalesce(max(sort_order), 0) + 1 AS m FROM skills"
    )!
    return run(
      "INSERT INTO skills (name, category, tariff, description, sort_order) VALUES (?, ?, ?, ?, ?)",
      d.name.trim(),
      d.category,
      tariff,
      blank(d.description),
      m
    )
  })

export const deleteSkill = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM skills WHERE id = ?", id)
  })
