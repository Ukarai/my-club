// First-run setup code. Until the first admin exists, /setup would let
// whoever reaches the site first claim the club. Requiring a code that only
// the person running the server can see closes that gap: either
// CLUB_SETUP_CODE, or a random code printed to the server log.
import { randomBytes, timingSafeEqual } from "node:crypto"
import { AuthError, sha256 } from "./auth"

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
