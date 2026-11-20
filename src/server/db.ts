import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { SKILL_SEED, TARIFF_UPDATES_2025 } from "./seed"

const DB_PATH = resolve(process.env.CLUB_DB_PATH ?? "data/club.db")

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS gymnasts (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,
  squad TEXT,
  level TEXT,
  guardian_contact TEXT,
  medical_info TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  tariff REAL NOT NULL DEFAULT 0,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Current status of each skill for each gymnast
CREATE TABLE IF NOT EXISTS gymnast_skills (
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  note TEXT,
  PRIMARY KEY (gymnast_id, skill_id)
);

-- Every status change (including clearing a status, recorded as
-- 'cleared'), with who made it, so progress can be reviewed and audited
CREATE TABLE IF NOT EXISTS skill_history (
  id INTEGER PRIMARY KEY,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  recorded_on TEXT NOT NULL,
  recorded_by TEXT,
  note TEXT
);

-- Custom groups (training sessions, comp teams, ability groups...).
-- Named club_groups because GROUPS is an SQL keyword.
CREATE TABLE IF NOT EXISTS club_groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'sky',
  -- The coach whose dashboard shows this group ("My groups"). Admins set it.
  primary_coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES club_groups(id) ON DELETE CASCADE,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  added_on TEXT NOT NULL DEFAULT (date('now')),
  PRIMARY KEY (group_id, gymnast_id)
);
CREATE INDEX IF NOT EXISTS group_members_gymnast ON group_members (gymnast_id);

-- Coaching notes about one skill for one gymnast (focus points, cues)
CREATE TABLE IF NOT EXISTS skill_notes (
  id INTEGER PRIMARY KEY,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'focus',
  body TEXT NOT NULL,
  author TEXT,
  noted_on TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS skill_notes_gymnast ON skill_notes (gymnast_id, skill_id);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  noted_on TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  author TEXT,
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
  goal_status TEXT,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  achieved_on TEXT
);

CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  venue TEXT,
  organiser TEXT,
  level TEXT,
  entry_deadline TEXT,
  entry_fee REAL,
  status TEXT NOT NULL DEFAULT 'planning',
  notes TEXT,
  -- When set, only admins can change routine cards for this competition
  routines_locked INTEGER NOT NULL DEFAULT 0,
  routines_locked_by TEXT,
  routines_locked_on TEXT
);

CREATE TABLE IF NOT EXISTS competition_entries (
  id INTEGER PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  gymnast_id INTEGER NOT NULL REFERENCES gymnasts(id) ON DELETE CASCADE,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
  fee_paid INTEGER NOT NULL DEFAULT 0,
  routine1 TEXT NOT NULL DEFAULT '[]',
  routine2 TEXT NOT NULL DEFAULT '[]',
  score REAL,
  placing INTEGER,
  notes TEXT,
  UNIQUE (competition_id, gymnast_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coach',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only a SHA-256 of each session token is stored, so a leaked database
-- can't be used to hijack live sessions.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- Failed sign-ins per email, for the temporary lockout. Kept in the database
-- so a restart doesn't reset it. Rows older than the lock window are pruned.
CREATE TABLE IF NOT EXISTS login_failures (
  email TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  first_at INTEGER NOT NULL  -- ms since epoch of the first failure in the window
);

CREATE TABLE IF NOT EXISTS competition_tasks (
  id INTEGER PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT,
  assignee TEXT,
  done INTEGER NOT NULL DEFAULT 0
);
`

function open() {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  return new DatabaseSync(DB_PATH)
}

// Schema statements are idempotent, so re-run them whenever this module is
// (re)loaded — the connection itself survives dev-server hot reloads.
let initialised = false
function init(conn: DatabaseSync) {
  conn.exec(SCHEMA)
  const { n } = conn.prepare("SELECT count(*) AS n FROM skills").get() as {
    n: number
  }
  if (n === 0) {
    const insert = conn.prepare(
      "INSERT INTO skills (name, category, tariff, description, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    SKILL_SEED.forEach((s, i) =>
      insert.run(s.name, s.category, s.tariff, s.description ?? null, i)
    )
  }
  migrate(conn)
}

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
function migrate(conn: DatabaseSync) {
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
}

const g = globalThis as unknown as { __clubDb?: DatabaseSync }

export function db() {
  const conn = (g.__clubDb ??= open())
  if (!initialised) {
    init(conn)
    initialised = true
  }
  return conn
}

// node:sqlite returns null-prototype rows; copy them into plain objects so
// they serialise cleanly across the server-function boundary.
export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return db()
    .prepare(sql)
    .all(...params)
    .map((r) => ({ ...r }) as T)
}

export function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  const row = db()
    .prepare(sql)
    .get(...params)
  return row ? ({ ...row } as T) : undefined
}

export function run(sql: string, ...params: SQLInputValue[]) {
  const r = db()
    .prepare(sql)
    .run(...params)
  return Number(r.lastInsertRowid)
}

export function tx<T>(fn: () => T): T {
  const d = db()
  d.exec("BEGIN")
  try {
    const out = fn()
    d.exec("COMMIT")
    return out
  } catch (e) {
    d.exec("ROLLBACK")
    throw e
  }
}
