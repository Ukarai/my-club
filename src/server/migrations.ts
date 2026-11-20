// Upgrades for databases made by older versions of the app.
import type { DatabaseSync } from "node:sqlite"
import { TARIFF_UPDATES_2025 } from "./seed"
import { SKILL_STATUSES } from "@/lib/domain"

/** ALTER TABLE ADD COLUMN, skipped when a fresh SCHEMA already has it. */
function addColumn(
  conn: DatabaseSync,
  table: string,
  column: string,
  type: string
) {
  const cols = conn.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  if (!cols.some((c) => c.name === column))
    conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
}

// One-off data migrations, tracked with SQLite's user_version so each runs
// exactly once per database (and never undoes a later edit by the club).
export function migrate(conn: DatabaseSync) {
  const { user_version: version } = conn
    .prepare("PRAGMA user_version")
    .get() as { user_version: number }
  if (version < 1) {
    // 2025-2028 Code of Points tariffs; only rows on the old default change.
    const update = conn.prepare(
      "UPDATE skills SET tariff = ? WHERE name = ? AND abs(tariff - ?) < 0.001"
    )
    for (const [name, from, to] of TARIFF_UPDATES_2025)
      update.run(to, name, from)
    conn.exec("PRAGMA user_version = 1")
  }
  if (version < 2) {
    // Routine locking. Fresh databases already have these from SCHEMA.
    addColumn(
      conn,
      "competitions",
      "routines_locked",
      "INTEGER NOT NULL DEFAULT 0"
    )
    addColumn(conn, "competitions", "routines_locked_by", "TEXT")
    addColumn(conn, "competitions", "routines_locked_on", "TEXT")
    conn.exec("PRAGMA user_version = 2")
  }
  if (version < 3) {
    // Who made each skill status change. Older rows stay NULL (unknown).
    addColumn(conn, "gymnast_skills", "updated_by", "TEXT")
    addColumn(conn, "skill_history", "recorded_by", "TEXT")
    conn.exec("PRAGMA user_version = 3")
  }
  if (version < 4) {
    // Each group's primary coach. Existing groups start with none.
    addColumn(
      conn,
      "club_groups",
      "primary_coach_id",
      "INTEGER REFERENCES users(id) ON DELETE SET NULL"
    )
    conn.exec("PRAGMA user_version = 4")
  }
  if (version < 5) {
    // Who set and closed each target, and the activity log (SCHEMA creates
    // it). Earlier skill history is copied in so it isn't lost from view.
    addColumn(conn, "targets", "created_by", "TEXT")
    addColumn(conn, "targets", "closed_by", "TEXT")
    conn.exec(SKILL_HISTORY_TO_ACTIVITY)
    conn.exec("PRAGMA user_version = 5")
  }
}

/**
 * Copies skill_history into the activity log, dated by when each change was
 * recorded. Used once by the migration above and by the demo data loader.
 */
export const SKILL_HISTORY_TO_ACTIVITY = `
INSERT INTO activity (at, user_name, action, summary, detail, subject, gymnast_id)
SELECT h.recorded_on, h.recorded_by, 'skill.status',
  CASE h.status
    WHEN 'cleared' THEN 'cleared ' || s.name
    ${SKILL_STATUSES.map((st) => `WHEN '${st.value}' THEN 'set ' || s.name || ' to ${st.label}'`).join(" ")}
    ELSE 'set ' || s.name || ' to ' || h.status
  END,
  h.note, g.first_name || ' ' || g.last_name, h.gymnast_id
FROM skill_history h
JOIN skills s ON s.id = h.skill_id
JOIN gymnasts g ON g.id = h.gymnast_id
ORDER BY h.recorded_on, h.id`
