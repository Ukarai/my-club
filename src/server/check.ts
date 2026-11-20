// Input checks for server functions. Every function that takes input parses
// it with a zod schema from here, so nothing sent from the browser reaches
// the database unchecked. Problems someone can cause from a form get a
// message written for them; anything else (a stale page or a hand-made
// request) gets a general one.
import { MIN_PASSWORD_LENGTH } from "@/lib/domain"
import { z } from "zod"

const BAD = "That request wasn't valid. Refresh the page and try again."

/** A server function validator: `.validator(check(schema))`. */
export function check<TSchema extends z.ZodType>(schema: TSchema) {
  return (data: z.input<TSchema>): z.output<TSchema> => {
    const r = schema.safeParse(data, { error: () => BAD })
    if (r.success) return r.data
    throw new Error(r.error.issues[0]?.message ?? BAD)
  }
}

/** Longest text each kind of field accepts. */
export const MAX = {
  name: 80,
  short: 120,
  title: 200,
  contact: 500,
  description: 1000,
  text: 5000,
  password: 200,
  email: 254,
} as const

/** A record's id. `missing` replaces the general message, e.g. for a link. */
export const id = (missing = BAD) =>
  z
    .number({ error: missing })
    .int({ error: missing })
    .positive({ error: missing })

const tooLong = (label: string, max: number) =>
  `${label} must be ${max.toLocaleString("en-GB")} characters or fewer`

/** Required text, trimmed. */
export const text = (
  label: string,
  max: number,
  empty = `${label} is required`
) => z.string().trim().min(1, empty).max(max, tooLong(label, max))

/** Optional text, trimmed. Blank becomes null. */
export const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(label, max))
    .nullish()
    .transform((v) => v || null)

function isRealDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    y >= 1900 &&
    y <= 2200 &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** A required calendar date, as YYYY-MM-DD. */
export const date = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(isRealDate, `${label} isn't a real date`)

/** An optional calendar date. Blank becomes null. */
export const optionalDate = (label: string) =>
  z
    .string()
    .refine((v) => v === "" || isRealDate(v), `${label} isn't a real date`)
    .nullish()
    .transform((v) => v || null)

/** One of a list's values, such as a status or a category. Takes any string
 * (forms send plain strings) and rejects anything not in the list. */
export const oneOf = <const T extends string>(list: readonly { value: T }[]) =>
  z.string().pipe(z.enum(list.map((i) => i.value) as [T, ...T[]]))

/** A new password. Not trimmed: spaces are allowed in passwords. */
export const newPassword = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  )
  .max(MAX.password, `Password must be ${MAX.password} characters or fewer`)

/** A password being checked, which only needs to be a sensible size. */
export const givenPassword = z.string().max(MAX.password)

/** An email address, trimmed and lower-cased. */
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX.email, `Email must be ${MAX.email} characters or fewer`)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address")
