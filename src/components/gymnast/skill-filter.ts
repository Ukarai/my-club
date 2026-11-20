import { SKILL_STATUSES, type SkillStatus } from "@/lib/domain"

/** What the skills list shows: a broad filter, or one stage. */
export type SkillFilter =
  "all" | "tracked" | "untracked" | "notes" | SkillStatus

export function isSkillFilter(v: unknown): v is SkillFilter {
  return (
    FILTERS.some((f) => f.value === v) ||
    SKILL_STATUSES.some((st) => st.value === v)
  )
}

export const FILTERS: { value: SkillFilter; label: string; empty: string }[] = [
  {
    value: "all",
    label: "All skills",
    empty: "No skills in the catalogue yet.",
  },
  { value: "tracked", label: "Started", empty: "No skills started yet." },
  {
    value: "untracked",
    label: "Not started",
    empty: "Every skill has been started.",
  },
  { value: "notes", label: "With notes", empty: "No skills with notes yet." },
]
