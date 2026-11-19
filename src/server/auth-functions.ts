import { createServerFn } from "@tanstack/react-start"
import { all, get, run, tx } from "./db"
import {
  AuthError,
  checkLockout,
  clearFailures,
  currentUser,
  endAllSessionsFor,
  endSession,
  hashPassword,
  recordFailure,
  requireRole,
  startSession,
  verifyAgainstDummy,
  verifyPassword,
} from "./auth"
import {
  MIN_PASSWORD_LENGTH,
  ROLES,
  type Role,
  type UserRow,
} from "@/lib/domain"

const input =
  <T>() =>
  (d: T) =>
    d

function checkPassword(pw: string) {
  if (pw.length < MIN_PASSWORD_LENGTH)
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    )
}
function checkRole(role: string): asserts role is Role {
  if (!ROLES.some((r) => r.value === role)) throw new Error("Unknown role")
}
function cleanEmail(email: string) {
  const e = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    throw new Error("Enter a valid email address")
  return e
}

const userCount = () => get<{ n: number }>("SELECT count(*) AS n FROM users")!.n
const adminCount = () =>
  get<{ n: number }>(
    "SELECT count(*) AS n FROM users WHERE role = 'admin' AND active = 1"
  )!.n

/** Who is signed in, and whether the club still needs its first admin. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async () => ({
    user: currentUser(),
    needsSetup: userCount() === 0,
  })
)

export const createFirstAdmin = createServerFn({ method: "POST" })
  .validator(input<{ name: string; email: string; password: string }>())
  .handler(async ({ data: d }) => {
    checkPassword(d.password)
    const email = cleanEmail(d.email)
    if (!d.name.trim()) throw new Error("Enter your name")
    const id = tx(() => {
      // Checked inside the transaction so setup can only ever happen once.
      if (userCount() > 0)
        throw new AuthError("Setup has already been completed")
      return run(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        d.name.trim(),
        email,
        hashPassword(d.password)
      )
    })
    startSession(id)
  })

export const login = createServerFn({ method: "POST" })
  .validator(input<{ email: string; password: string }>())
  .handler(async ({ data: d }) => {
    const email = d.email.trim().toLowerCase()
    checkLockout(email)
    const user = get<{ id: number; password_hash: string; active: number }>(
      "SELECT id, password_hash, active FROM users WHERE email = ?",
      email
    )
    const ok = user
      ? verifyPassword(d.password, user.password_hash)
      : (verifyAgainstDummy(d.password), false)
    if (!user || !ok || !user.active) {
      recordFailure(email)
      throw new AuthError("Incorrect email or password")
    }
    clearFailures(email)
    startSession(user.id)
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  endSession()
})

export const changeOwnPassword = createServerFn({ method: "POST" })
  .validator(input<{ current: string; next: string }>())
  .handler(async ({ data: d }) => {
    const me = requireRole("viewer")
    const row = get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = ?",
      me.id
    )!
    if (!verifyPassword(d.current, row.password_hash))
      throw new Error("Current password is incorrect")
    checkPassword(d.next)
    run(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      hashPassword(d.next),
      me.id
    )
    endAllSessionsFor(me.id, true) // sign out other devices
  })

// ── User management (admins only) ──

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  requireRole("admin")
  return all<UserRow>(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name"
  )
})

export const createUser = createServerFn({ method: "POST" })
  .validator(
    input<{ name: string; email: string; role: string; password: string }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("admin")
    checkRole(d.role)
    checkPassword(d.password)
    const email = cleanEmail(d.email)
    if (!d.name.trim()) throw new Error("Enter a name")
    if (get("SELECT 1 FROM users WHERE email = ?", email))
      throw new Error("There's already a user with that email")
    return run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      d.name.trim(),
      email,
      hashPassword(d.password),
      d.role
    )
  })

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    input<{ id: number; role?: string; active?: boolean; password?: string }>()
  )
  .handler(async ({ data: d }) => {
    const me = requireRole("admin")
    const target = get<{ role: Role; active: number }>(
      "SELECT role, active FROM users WHERE id = ?",
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

    tx(() => {
      if (d.role !== undefined) {
        checkRole(d.role)
        run("UPDATE users SET role = ? WHERE id = ?", d.role, d.id)
      }
      if (d.active !== undefined) {
        run("UPDATE users SET active = ? WHERE id = ?", d.active ? 1 : 0, d.id)
        if (!d.active) endAllSessionsFor(d.id)
      }
      if (d.password) {
        checkPassword(d.password)
        run(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          hashPassword(d.password),
          d.id
        )
        endAllSessionsFor(d.id, d.id === me.id)
      }
    })
  })
