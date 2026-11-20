// Brute-force protection for sign-in, counted per email. Failures are stored
// in the database, so a lock survives restarts and redeploys.
import { AuthError } from "./auth"
import { get, run } from "./db"

const MAX_FAILURES = 10
const LOCK_MS = 15 * 60000

export function checkLockout(email: string) {
  const f = get<{ count: number; first_at: number }>(
    "SELECT count, first_at FROM login_failures WHERE email = ?",
    email.toLowerCase()
  )
  if (f && f.count >= MAX_FAILURES && Date.now() - f.first_at < LOCK_MS) {
    throw new AuthError("Too many failed attempts. Try again in 15 minutes.")
  }
}

export function recordFailure(email: string) {
  const now = Date.now()
  run("DELETE FROM login_failures WHERE first_at < ?", now - LOCK_MS)
  run(
    `INSERT INTO login_failures (email, count, first_at) VALUES (?, 1, ?)
     ON CONFLICT (email) DO UPDATE SET count = count + 1`,
    email.toLowerCase(),
    now
  )
}

export function clearFailures(email: string) {
  run("DELETE FROM login_failures WHERE email = ?", email.toLowerCase())
}
