// Development-only test accounts, selectable from a picker on the login page.
// Everything here is gated on import.meta.env.DEV, which is statically false
// in production builds, so none of it can be used on a deployed site.
import { randomBytes } from "node:crypto"
import { run } from "./db"
import { hashPassword } from "./auth"
import type { Role } from "@/lib/domain"

export const TEST_LOGIN_ENABLED = import.meta.env.DEV

export const TEST_ACCOUNTS: ReadonlyArray<{
  name: string
  email: string
  role: Role
}> = [
  { name: "Alex Admin", email: "admin@example.test", role: "admin" },
  { name: "Casey Head Coach", email: "headcoach@example.test", role: "coach" },
  { name: "Jordan Coach", email: "coach@example.test", role: "coach" },
  { name: "Sam Parent", email: "parent@example.test", role: "viewer" },
  { name: "Riley Volunteer", email: "volunteer@example.test", role: "viewer" },
]

let ensured = false

/** Create any missing test accounts. Existing ones (and edits to them) are left alone. */
export function ensureTestAccounts() {
  if (!TEST_LOGIN_ENABLED || ensured) return
  for (const a of TEST_ACCOUNTS) {
    // Random password nobody knows: these accounts are only reachable via the picker.
    run(
      "INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      a.name,
      a.email,
      hashPassword(randomBytes(16).toString("hex")),
      a.role
    )
  }
  ensured = true
}
