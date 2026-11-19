// Shape of the gymnast page's loader data, shared by its tab components.
import type { getGymnast } from "@/server/functions/gymnasts"

export type GymnastData = Awaited<ReturnType<typeof getGymnast>>
