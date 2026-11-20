// The database schema. Each table and index is created only if it's missing.
export const SCHEMA = `
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
  achieved_on TEXT,
  created_by TEXT,
  -- Who marked it achieved or dropped (or whose skill update achieved it)
  closed_by TEXT
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

-- Who did what, and when: a row for every change made in the app. A
-- gymnast's rows go when the gymnast is deleted; rows about a deleted
-- competition or group stay, named by subject.
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,          -- ISO timestamp (a plain date for copied skill history)
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,            -- their name at the time; NULL when not recorded
  action TEXT NOT NULL,      -- area.verb, e.g. 'note.add'
  summary TEXT NOT NULL,     -- what they did, read after their name
  detail TEXT,
  subject TEXT,              -- gymnast, competition or group name at the time
  gymnast_id INTEGER REFERENCES gymnasts(id) ON DELETE CASCADE,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE SET NULL,
  group_id INTEGER REFERENCES club_groups(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS activity_at ON activity (at);
CREATE INDEX IF NOT EXISTS activity_gymnast ON activity (gymnast_id, at);
`
