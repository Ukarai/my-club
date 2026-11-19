// Back up the club database while the app is running.
//
//   pnpm backup                 -> data/backups/club-2026-11-19_14-05-00.db
//   pnpm backup /mnt/backups    -> a different folder
//
// Uses SQLite's VACUUM INTO, which writes a consistent, compacted copy even
// while the app is reading and writing. Keeps the newest CLUB_BACKUP_KEEP
// backups (default 14) in the folder and deletes older ones.
//
// Environment: CLUB_DB_PATH (default data/club.db), CLUB_BACKUP_DIR,
// CLUB_BACKUP_KEEP.
import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const dbPath = path.resolve(process.env.CLUB_DB_PATH ?? "data/club.db")
const dir = path.resolve(
  process.argv[2] ??
    process.env.CLUB_BACKUP_DIR ??
    path.join(path.dirname(dbPath), "backups")
)
const keep = Math.max(1, Number(process.env.CLUB_BACKUP_KEEP) || 14)

if (!fs.existsSync(dbPath)) {
  console.error(`No database found at ${dbPath}`)
  process.exit(1)
}
fs.mkdirSync(dir, { recursive: true })

const stamp = new Date()
  .toISOString()
  .slice(0, 19)
  .replace("T", "_")
  .replaceAll(":", "-")
const target = path.join(dir, `club-${stamp}.db`)
if (fs.existsSync(target)) {
  console.error(`${target} already exists`)
  process.exit(1)
}

const db = new DatabaseSync(dbPath)
db.exec("PRAGMA busy_timeout = 10000")
db.prepare("VACUUM INTO ?").run(target)
db.close()

// Sanity-check the copy before pruning anything.
const check = new DatabaseSync(target, { readOnly: true })
const { integrity_check: ok } = check.prepare("PRAGMA integrity_check").get()
check.close()
if (ok !== "ok") {
  console.error(`Backup at ${target} failed its integrity check: ${ok}`)
  process.exit(1)
}

const old = fs
  .readdirSync(dir)
  .filter((f) => /^club-[\d_-]+\.db$/.test(f))
  .sort()
  .reverse()
  .slice(keep)
for (const f of old) fs.rmSync(path.join(dir, f))

const kb = Math.round(fs.statSync(target).size / 1024)
console.log(
  `Backed up ${dbPath} to ${target} (${kb} KB)` +
    (old.length ? `; removed ${old.length} older backup(s)` : "")
)
