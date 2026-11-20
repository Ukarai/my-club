// Server-only auth helpers: sessions and role checks.
// Only call these from inside server-function handlers.
import { createHash, randomBytes } from "node:crypto"
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server"
import { get, run } from "./db"
import { type SessionUser } from "@/lib/domain"
import { hasRole, type Role } from "@/lib/roles"

const COOKIE = "club_session"
const SESSION_DAYS = 30

export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex")

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
