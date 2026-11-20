// The club-wide activity feed: who did what, newest first.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all } from "../db"
import { MAX, check } from "../check"
import { ACTIVITY_PAGE_SIZE, hasRole } from "@/lib/domain"
import type { Activity } from "@/lib/domain"

export const listActivity = createServerFn({ method: "GET" })
  .validator(
    check(
      z.object({
        /** Only this person's actions. */
        who: z.string().trim().max(MAX.name).optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const limit = d.limit ?? ACTIVITY_PAGE_SIZE
    // Account changes (roles, password resets) are for admins' eyes only.
    const visible = hasRole(user, "admin")
      ? "1 = 1"
      : "action NOT LIKE 'user.%'"
    const where = d.who ? `${visible} AND user_name = ?` : visible
    const args = d.who ? [d.who] : []
    const rows = all<Activity>(
      `SELECT * FROM activity WHERE ${where} ORDER BY at DESC, id DESC LIMIT ?`,
      ...args,
      limit + 1
    )
    return {
      rows: rows.slice(0, limit),
      hasMore: rows.length > limit,
      people: all<{ name: string }>(
        `SELECT DISTINCT user_name AS name FROM activity
         WHERE ${visible} AND user_name IS NOT NULL ORDER BY user_name`
      ).map((p) => p.name),
    }
  })
