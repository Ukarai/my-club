// The signed-in user's own account.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { logActivity } from "../activity"
import { endAllSessionsFor, requireRole } from "../auth"
import { check, givenPassword, newPassword } from "../check"
import { get, run, tx } from "../db"
import { hashPassword, verifyPassword } from "../passwords"

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
