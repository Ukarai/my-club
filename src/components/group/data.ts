import type { getGroup } from "@/server/functions/groups"

export type GroupData = Awaited<ReturnType<typeof getGroup>>
