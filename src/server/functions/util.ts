// Small helpers shared by the server function modules.
import { SKILL_STATUSES } from "@/lib/domain"

/** Typed pass-through validator. Inputs are trusted to match T. */
export const input =
  <T>() =>
  (d: T) =>
    d
export const blank = (v: string | null | undefined) =>
  v && v.trim() ? v.trim() : null
export const rank = (s: string | null) =>
  SKILL_STATUSES.findIndex((x) => x.value === s)
