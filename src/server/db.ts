import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { SKILL_SEED } from "./seed"
import { SCHEMA } from "./schema"
import { migrate } from "./migrations"

const DB_PATH = resolve(process.env.CLUB_DB_PATH ?? "data/club.db")

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
