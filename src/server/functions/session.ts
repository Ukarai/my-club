// Signing in and out, the current session, and first-run admin setup.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { logActivity } from "../activity"
import { AuthError, currentUser, endSession, startSession } from "../auth"
import { MAX, check, email, givenPassword, newPassword, text } from "../check"
import { get, run, tx } from "../db"
import { checkLockout, clearFailures, recordFailure } from "../lockout"
import { hashPassword, verifyAgainstDummy, verifyPassword } from "../passwords"
import { checkSetupCode, setupCode } from "../setup-code"
import { ensureTestAccounts } from "../test-accounts"

const userCount = () => get<{ n: number }>("SELECT count(*) AS n FROM users")!.n

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
