// User management. Admins only.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { article, logActivity } from "../activity"
import { endAllSessionsFor, requireRole } from "../auth"
import { MAX, check, email, id, newPassword, oneOf, text } from "../check"
import { all, get, run, tx } from "../db"
import { hashPassword } from "../passwords"
import { type UserRow, labelFor } from "@/lib/domain"
import { ROLES, type Role } from "@/lib/roles"

const adminCount = () =>
  get<{ n: number }>(
    "SELECT count(*) AS n FROM users WHERE role = 'admin' AND active = 1"
  )!.n

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  requireRole("admin")
  return all<UserRow>(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name"
  )
})

const roleName = (role: Role) => labelFor(ROLES, role).toLowerCase()

export const createUser = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        name: text("Name", MAX.name, "Enter a name"),
        email,
        role: oneOf(ROLES),
        password: newPassword,
      })
    )
  )
  .handler(async ({ data: d }) => {
    const me = requireRole("admin")
    if (get("SELECT 1 FROM users WHERE email = ?", d.email))
      throw new Error("There's already a user with that email")
    return tx(() => {
      const userId = run(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        d.name,
        d.email,
        hashPassword(d.password),
        d.role
      )
      logActivity(
        me,
        "user.add",
        `added ${d.name} as ${article(roleName(d.role))}`
      )
      return userId
    })
  })

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id(),
        role: oneOf(ROLES).optional(),
        active: z.boolean().optional(),
        password: newPassword.optional(),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const me = requireRole("admin")
    const target = get<{ name: string; role: Role; active: number }>(
      "SELECT name, role, active FROM users WHERE id = ?",
      d.id
    )
    if (!target) throw new Error("User not found")

    const losingAdmin =
      target.role === "admin" &&
      target.active === 1 &&
      ((d.role !== undefined && d.role !== "admin") || d.active === false)
    if (losingAdmin && adminCount() <= 1)
      throw new Error("The club needs at least one active admin")
    if (
      d.id === me.id &&
      (d.active === false || (d.role && d.role !== "admin"))
    )
      throw new Error(
        "You can't remove your own admin access — ask another admin"
      )

    const name = target.name
    tx(() => {
      if (d.role !== undefined && d.role !== target.role) {
        run("UPDATE users SET role = ? WHERE id = ?", d.role, d.id)
        logActivity(
          me,
          "user.role",
          `changed ${name}'s role to ${labelFor(ROLES, d.role)}`
        )
      }
      if (d.active !== undefined && d.active !== Boolean(target.active)) {
        run("UPDATE users SET active = ? WHERE id = ?", d.active ? 1 : 0, d.id)
        if (!d.active) endAllSessionsFor(d.id)
        logActivity(
          me,
          d.active ? "user.reactivate" : "user.deactivate",
          d.active
            ? `reactivated ${name}'s account`
            : `deactivated ${name}'s account`
        )
      }
      // Only active coaches and admins can be a group's primary coach.
      if (d.role === "viewer" || d.active === false)
        run(
          "UPDATE club_groups SET primary_coach_id = NULL WHERE primary_coach_id = ?",
          d.id
        )
      if (d.password !== undefined) {
        run(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          hashPassword(d.password),
          d.id
        )
        endAllSessionsFor(d.id, d.id === me.id)
        logActivity(me, "user.password", `reset ${name}'s password`)
      }
    })
  })
