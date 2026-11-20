// Dashboard summary: upcoming competitions, open injuries, groups and the
// newest gymnasts. Coaches who are a group's primary coach see their groups
// (and those groups' gymnasts) by default ("My groups"), and can switch to the
// whole club.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { all, get } from "../db"
import { check } from "../check"
import { today } from "@/lib/dates"
import type {
  CompetitionSummary,
  GroupSummary,
  Gymnast,
  Note,
} from "@/lib/domain"

export type DashboardView = "mine" | "all"

/** How many of the newest gymnasts the dashboard lists. */
const NEWEST_LIMIT = 5

export const getDashboard = createServerFn({ method: "GET" })
  .validator(check(z.object({ view: z.enum(["mine", "all"]).optional() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("viewer")
    const t = today()

    const allGroups = all<GroupSummary>(
      `SELECT gr.*, u.name AS primary_coach_name,
        (SELECT count(*) FROM group_members m JOIN gymnasts g ON g.id = m.gymnast_id
           WHERE m.group_id = gr.id AND g.active = 1) AS member_count
       FROM club_groups gr LEFT JOIN users u ON u.id = gr.primary_coach_id
       ORDER BY gr.name`
    )
    const myGroups = allGroups.filter((g) => g.primary_coach_id === user.id)
    // Default to "My groups" for anyone who has some.
    const view: DashboardView =
      myGroups.length && d.view !== "all" ? "mine" : "all"
    const mine = view === "mine"

    // Limits a query to gymnasts in the user's groups; `g` is the gymnast.
    const scope = mine
      ? ` AND g.id IN (SELECT m.gymnast_id FROM group_members m
           JOIN club_groups gr ON gr.id = m.group_id WHERE gr.primary_coach_id = ?)`
      : ""
    const scopeArgs = mine ? [user.id] : []

    return {
      view,
      /** Whether the user can switch to "My groups". */
      hasGroups: myGroups.length > 0,
      /** Active gymnasts in the whole club, for the first-run welcome. */
      gymnastCount: get<{ n: number }>(
        "SELECT count(*) AS n FROM gymnasts WHERE active = 1"
      )!.n,
      // Competitions are club-wide; "My groups" adds how many of the
      // user's gymnasts are entered.
      upcoming: all<CompetitionSummary & { my_entry_count: number | null }>(
        `SELECT c.*,
        (SELECT count(*) FROM competition_entries e WHERE e.competition_id = c.id AND e.status != 'withdrawn') AS entry_count,
        (SELECT count(*) FROM competition_tasks k WHERE k.competition_id = c.id AND k.done = 0) AS open_tasks,
        ${
          mine
            ? `(SELECT count(*) FROM competition_entries e JOIN gymnasts g ON g.id = e.gymnast_id
                WHERE e.competition_id = c.id AND e.status != 'withdrawn'${scope})`
            : "NULL"
        } AS my_entry_count
       FROM competitions c
       WHERE coalesce(c.end_date, c.start_date) >= ? AND c.status != 'cancelled'
       ORDER BY c.start_date LIMIT 5`,
        ...scopeArgs,
        t
      ),
      injuries: all<Note & { gymnast_name: string }>(
        `SELECT n.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM notes n JOIN gymnasts g ON g.id = n.gymnast_id
       WHERE n.category = 'injury' AND n.resolved = 0 AND g.active = 1${scope}
       ORDER BY n.noted_on DESC`,
        ...scopeArgs
      ),
      groups: mine ? myGroups : allGroups,
      newestGymnasts: all<
        Pick<
          Gymnast,
          "id" | "first_name" | "last_name" | "squad" | "level" | "created_at"
        >
      >(
        `SELECT g.id, g.first_name, g.last_name, g.squad, g.level, g.created_at
       FROM gymnasts g WHERE g.active = 1${scope}
       ORDER BY g.created_at DESC, g.id DESC LIMIT ?`,
        ...scopeArgs,
        NEWEST_LIMIT
      ),
    }
  })
