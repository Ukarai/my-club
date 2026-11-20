// Dashboard summary: upcoming competitions, open injuries, recent progress.
// Coaches who are a group's primary coach see their groups' gymnasts by
// default ("My groups"), and can switch to the whole club.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { all, get } from "../db"
import { today } from "@/lib/domain"
import type {
  CompetitionSummary,
  GroupColor,
  Note,
  SkillHistory,
  Target,
} from "@/lib/domain"
import { input } from "./util"

export type DashboardView = "mine" | "all"

export type MyGroup = {
  id: number
  name: string
  color: GroupColor
  member_count: number
}

export const getDashboard = createServerFn({ method: "GET" })
  .validator(input<{ view?: DashboardView }>())
  .handler(async ({ data: d }) => {
    const user = requireRole("viewer")
    const t = today()

    const myGroups = all<MyGroup>(
      `SELECT gr.id, gr.name, gr.color,
        (SELECT count(*) FROM group_members m JOIN gymnasts g ON g.id = m.gymnast_id
           WHERE m.group_id = gr.id AND g.active = 1) AS member_count
       FROM club_groups gr WHERE gr.primary_coach_id = ? ORDER BY gr.name`,
      user.id
    )
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
      myGroups,
      counts: get<{
        gymnasts: number
        skills: number
        targets: number
        injuries: number
      }>(
        `SELECT
        (SELECT count(*) FROM gymnasts WHERE active = 1) AS gymnasts,
        (SELECT count(*) FROM skills) AS skills,
        (SELECT count(*) FROM targets t JOIN gymnasts g ON g.id = t.gymnast_id
           WHERE t.status = 'active' AND g.active = 1) AS targets,
        (SELECT count(*) FROM notes n JOIN gymnasts g ON g.id = n.gymnast_id
           WHERE n.category = 'injury' AND n.resolved = 0 AND g.active = 1) AS injuries`
      )!,
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
      targetsDue: all<Target & { gymnast_name: string }>(
        `SELECT t.*, s.name AS skill_name, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM targets t JOIN gymnasts g ON g.id = t.gymnast_id
       LEFT JOIN skills s ON s.id = t.skill_id
       WHERE t.status = 'active' AND g.active = 1${scope}
       ORDER BY t.target_date IS NULL, t.target_date LIMIT 8`,
        ...scopeArgs
      ),
      injuries: all<Note & { gymnast_name: string }>(
        `SELECT n.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM notes n JOIN gymnasts g ON g.id = n.gymnast_id
       WHERE n.category = 'injury' AND n.resolved = 0 AND g.active = 1${scope}
       ORDER BY n.noted_on DESC`,
        ...scopeArgs
      ),
      recentProgress: all<
        SkillHistory & { gymnast_id: number; gymnast_name: string }
      >(
        `SELECT h.*, s.name AS skill_name, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM skill_history h JOIN skills s ON s.id = h.skill_id
       JOIN gymnasts g ON g.id = h.gymnast_id
       WHERE h.status != 'cleared'${scope}
       ORDER BY h.recorded_on DESC, h.id DESC LIMIT 10`,
        ...scopeArgs
      ),
    }
  })
