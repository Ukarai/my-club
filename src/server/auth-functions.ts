import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { all, get, run, tx } from "./db"
import {
  AuthError,
  checkLockout,
  checkSetupCode,
  clearFailures,
  currentUser,
  endAllSessionsFor,
  endSession,
  hashPassword,
  recordFailure,
  requireRole,
  setupCode,
  startSession,
  verifyAgainstDummy,
  verifyPassword,
} from "./auth"
import { MAX, check, id, oneOf, text } from "./check"
import { article, logActivity } from "./activity"
import {
  TEST_ACCOUNTS,
  TEST_LOGIN_ENABLED,
  ensureTestAccounts,
} from "./test-accounts"
import {
  MIN_PASSWORD_LENGTH,
  ROLES,
  labelFor,
  type Role,
  type UserRow,
} from "@/lib/domain"

/** A new password. Not trimmed: spaces are allowed in passwords. */
const newPassword = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  )
  .max(MAX.password, `Password must be ${MAX.password} characters or fewer`)

/** A password being checked, which only needs to be a sensible size. */
const givenPassword = z.string().max(MAX.password)

/** An email address, trimmed and lower-cased. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX.email, `Email must be ${MAX.email} characters or fewer`)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address")

const userCount = () => get<{ n: number }>("SELECT count(*) AS n FROM users")!.n
const adminCount = () =>
  get<{ n: number }>(
    "SELECT count(*) AS n FROM users WHERE role = 'admin' AND active = 1"
  )!.n

/** Who is signed in, and whether the club still needs its first admin. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    ensureTestAccounts()
    const needsSetup = userCount() === 0
    // Makes sure a generated setup code has been printed to the log.
    if (needsSetup) setupCode()
    return { user: currentUser(), needsSetup }
  }
)

// ── Development-only test account picker ──

export const listTestAccounts = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!TEST_LOGIN_ENABLED) return []
    ensureTestAccounts()
    const emails = TEST_ACCOUNTS.map((a) => a.email)
    return all<{ email: string; name: string; role: Role }>(
      `SELECT email, name, role FROM users
       WHERE active = 1 AND email IN (${emails.map(() => "?").join(",")})`,
      ...emails
    ).sort(
      (a, b) =>
        emails.indexOf(a.email.toLowerCase()) -
        emails.indexOf(b.email.toLowerCase())
    )
  }
)

export const testLogin = createServerFn({ method: "POST" })
  .validator(check(z.string().trim().toLowerCase().max(MAX.email)))
  .handler(async ({ data: account }) => {
    if (!TEST_LOGIN_ENABLED)
      throw new AuthError("Test accounts are only available in development")
    if (!TEST_ACCOUNTS.some((a) => a.email === account))
      throw new AuthError("Not a test account")
    const user = get<{ id: number }>(
      "SELECT id FROM users WHERE email = ? AND active = 1",
      account
    )
    if (!user) throw new AuthError("That test account is deactivated")
    endSession()
    startSession(user.id)
  })

export const createFirstAdmin = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        setupCode: z.string().max(200),
        name: text("Name", MAX.name, "Enter your name"),
        email,
        password: newPassword,
      })
    )
  )
  .handler(async ({ data: d }) => {
    // Only someone who can see the server (its log or its settings) can
    // create the first admin.
    checkSetupCode(d.setupCode)
    const userId = tx(() => {
      // Checked inside the transaction so setup can only ever happen once.
      if (userCount() > 0)
        throw new AuthError("Setup has already been completed")
      const newId = run(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        d.name,
        d.email,
        hashPassword(d.password)
      )
      logActivity(
        { id: newId, name: d.name },
        "user.setup",
        "set up the club as its first admin"
      )
      return newId
    })
    startSession(userId)
  })

export const login = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        email: z.string().trim().toLowerCase().max(MAX.email),
        password: givenPassword,
      })
    )
  )
  .handler(async ({ data: d }) => {
    checkLockout(d.email)
    const user = get<{ id: number; password_hash: string; active: number }>(
      "SELECT id, password_hash, active FROM users WHERE email = ?",
      d.email
    )
    const ok = user
      ? verifyPassword(d.password, user.password_hash)
      : (verifyAgainstDummy(d.password), false)
    if (!user || !ok || !user.active) {
      recordFailure(d.email)
      throw new AuthError("Incorrect email or password")
    }
    clearFailures(d.email)
    startSession(user.id)
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  endSession()
})

export const changeOwnPassword = createServerFn({ method: "POST" })
  .validator(check(z.object({ current: givenPassword, next: newPassword })))
  .handler(async ({ data: d }) => {
    const me = requireRole("viewer")
    const row = get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = ?",
      me.id
    )!
    if (!verifyPassword(d.current, row.password_hash))
      throw new Error("Current password is incorrect")
    tx(() => {
      run(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        hashPassword(d.next),
        me.id
      )
      logActivity(me, "user.own-password", "changed their own password")
    })
    endAllSessionsFor(me.id, true) // sign out other devices
  })

// ── User management (admins only) ──

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  requireRole("admin")
  return all<UserRow>(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name"
  )
})

const roleName = (role: Role) => labelFor(ROLES, role).toLowerCase()

export const createUser = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        name: text("Name", MAX.name, "Enter a name"),
        email,
        role: oneOf(ROLES),
        password: newPassword,
      })
    )
  )
  .handler(async ({ data: d }) => {
    const me = requireRole("admin")
    if (get("SELECT 1 FROM users WHERE email = ?", d.email))
      throw new Error("There's already a user with that email")
    return tx(() => {
      const userId = run(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        d.name,
        d.email,
        hashPassword(d.password),
        d.role
      )
      logActivity(
        me,
        "user.add",
        `added ${d.name} as ${article(roleName(d.role))}`
      )
      return userId
    })
  })

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id(),
        role: oneOf(ROLES).optional(),
        active: z.boolean().optional(),
        password: newPassword.optional(),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const me = requireRole("admin")
    const target = get<{ name: string; role: Role; active: number }>(
      "SELECT name, role, active FROM users WHERE id = ?",
      d.id
    )
    if (!target) throw new Error("User not found")

    const losingAdmin =
      target.role === "admin" &&
      target.active === 1 &&
      ((d.role !== undefined && d.role !== "admin") || d.active === false)
    if (losingAdmin && adminCount() <= 1)
      throw new Error("The club needs at least one active admin")
    if (
      d.id === me.id &&
      (d.active === false || (d.role && d.role !== "admin"))
    )
      throw new Error(
        "You can't remove your own admin access — ask another admin"
      )

    const name = target.name
    tx(() => {
      if (d.role !== undefined && d.role !== target.role) {
        run("UPDATE users SET role = ? WHERE id = ?", d.role, d.id)
        logActivity(
          me,
          "user.role",
          `changed ${name}'s role to ${labelFor(ROLES, d.role)}`
        )
      }
      if (d.active !== undefined && d.active !== Boolean(target.active)) {
        run("UPDATE users SET active = ? WHERE id = ?", d.active ? 1 : 0, d.id)
        if (!d.active) endAllSessionsFor(d.id)
        logActivity(
          me,
          d.active ? "user.reactivate" : "user.deactivate",
          d.active
            ? `reactivated ${name}'s account`
            : `deactivated ${name}'s account`
        )
      }
      // Only active coaches and admins can be a group's primary coach.
      if (d.role === "viewer" || d.active === false)
        run(
          "UPDATE club_groups SET primary_coach_id = NULL WHERE primary_coach_id = ?",
          d.id
        )
      if (d.password !== undefined) {
        run(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          hashPassword(d.password),
          d.id
        )
        endAllSessionsFor(d.id, d.id === me.id)
        logActivity(me, "user.password", `reset ${name}'s password`)
      }
    })
  })
