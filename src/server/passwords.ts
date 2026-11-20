// Password hashing with scrypt and a per-user salt.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

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
