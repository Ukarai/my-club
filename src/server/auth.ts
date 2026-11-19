// Server-only auth helpers: password hashing, sessions and role checks.
// Only call these from inside server-function handlers.
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server"
import { get, run } from "./db"
import { hasRole, type Role, type SessionUser } from "@/lib/domain"

const COOKIE = "club_session"
const SESSION_DAYS = 30

// ── Passwords (scrypt, per-user salt) ──

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$")
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, "hex")
  const actual = scryptSync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length
  )
  return timingSafeEqual(actual, expected)
}

// A real hash to compare against when the email doesn't exist, so a login
// attempt takes the same time whether or not the account is real.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"))
export function verifyAgainstDummy(password: string) {
  verifyPassword(password, DUMMY_HASH)
}

// ── Sessions ──

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

export function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url")
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  run(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    sha256(token),
    userId,
    expires.toISOString()
  )
  // Opportunistically clear out expired sessions.
  run("DELETE FROM sessions WHERE expires_at < ?", new Date().toISOString())
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  })
}

export function endSession() {
  const token = getCookie(COOKIE)
  if (token) run("DELETE FROM sessions WHERE token_hash = ?", sha256(token))
  deleteCookie(COOKIE, { path: "/" })
}

export function endAllSessionsFor(userId: number, exceptCurrent = false) {
  const token = getCookie(COOKIE)
  if (exceptCurrent && token) {
    run(
      "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?",
      userId,
      sha256(token)
    )
  } else {
    run("DELETE FROM sessions WHERE user_id = ?", userId)
  }
}

export function currentUser(): SessionUser | null {
  const token = getCookie(COOKIE)
  if (!token) return null
  const user = get<SessionUser>(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
    sha256(token),
    new Date().toISOString()
  )
  return user ?? null
}

export class AuthError extends Error {}

/** Require a signed-in user with at least the given role. */
export function requireRole(min: Role = "viewer"): SessionUser {
  const user = currentUser()
  if (!user) throw new AuthError("Please sign in again.")
  if (!hasRole(user, min))
    throw new AuthError("You don't have permission to do that.")
  return user
}

// ── Brute-force protection: per email, stored in the database so it
//    survives restarts and redeploys ──

const MAX_FAILURES = 10
const LOCK_MS = 15 * 60_000

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

// ── First-run setup code ──
// Until the first admin exists, /setup would let whoever reaches the site
// first claim the club. Requiring a code that only the person running the
// server can see closes that gap: either CLUB_SETUP_CODE, or a random code
// printed to the server log.

const MIN_SETUP_CODE_LENGTH = 12
// 32 characters (no 0/O or 1/I), so each random byte maps without bias
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
let generatedCode: string | undefined

function generateSetupCode() {
  const chars = [...randomBytes(16)].map((b) => CODE_ALPHABET[b % 32])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-")
}

/**
 * The code /setup requires. The first time a random code is needed it is
 * printed to the server log, along with how to find the setup page.
 */
export function setupCode(): string {
  const configured = process.env.CLUB_SETUP_CODE?.trim()
  if (configured && configured.length >= MIN_SETUP_CODE_LENGTH)
    return configured
  if (!generatedCode) {
    generatedCode = generateSetupCode()
    if (configured)
      console.warn(
        `CLUB_SETUP_CODE is ignored: it must be at least ${MIN_SETUP_CODE_LENGTH} characters.`
      )
    console.log(
      [
        "",
        "  ┌─ No admin account yet ──────────────────────────────",
        "  │ To set up the club, open /setup and enter this code:",
        "  │",
        `  │     ${generatedCode}`,
        "  │",
        "  │ It changes whenever the app restarts. Set CLUB_SETUP_CODE",
        "  │ to choose your own.",
        "  └─────────────────────────────────────────────────────",
        "",
      ].join("\n")
    )
  }
  return generatedCode
}

export function checkSetupCode(entered: string) {
  const expected = setupCode()
  // Generated codes are forgiving about case, spaces and dashes.
  const norm = (s: string) =>
    expected === generatedCode
      ? s.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : s.trim()
  const digest = (s: string) => Buffer.from(sha256(norm(s)), "hex")
  if (!timingSafeEqual(digest(entered), digest(expected)))
    throw new AuthError(
      "That setup code isn't right. You'll find it in the server's log."
    )
}
