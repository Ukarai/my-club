import type { listSkills } from "@/server/functions/skills"

export type SkillRow = Awaited<ReturnType<typeof listSkills>>[number]
