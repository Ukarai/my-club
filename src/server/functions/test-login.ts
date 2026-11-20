// Development-only: sign in as one of the test accounts without a password.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { AuthError, endSession, startSession } from "../auth"
import { MAX, check } from "../check"
import { all, get } from "../db"
import {
  TEST_ACCOUNTS,
  TEST_LOGIN_ENABLED,
  ensureTestAccounts,
} from "../test-accounts"
import type { Role } from "@/lib/roles"

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
