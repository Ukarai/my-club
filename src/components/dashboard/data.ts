import type { getDashboard } from "@/server/functions/dashboard"

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>
