// Small helpers shared by the server function modules.
import { SKILL_STATUSES } from "@/lib/domain"

export const rank = (s: string | null) =>
  SKILL_STATUSES.findIndex((x) => x.value === s)
