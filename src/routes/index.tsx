import { createFileRoute } from "@tanstack/react-router"
import { getDashboard, type DashboardView } from "@/server/functions/dashboard"
import { useUser } from "@/lib/use-user"
import { CompetitionsCard } from "@/components/dashboard/competitions-card"
import { InjuriesCard } from "@/components/dashboard/injuries-card"
import { GroupsCard } from "@/components/dashboard/groups-card"
import { NewestGymnastsCard } from "@/components/dashboard/newest-gymnasts-card"
import { Welcome } from "@/components/dashboard/welcome"
import { ViewBar } from "@/components/dashboard/view-bar"
import { Bolt } from "@/components/dashboard/bolt"

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { view?: DashboardView } =>
    s.view === "mine" || s.view === "all" ? { view: s.view } : {},
  loaderDeps: ({ search }) => ({ view: search.view }),
  loader: ({ deps }) => getDashboard({ data: { view: deps.view } }),
  component: Dashboard,
})

function greeting(now: Date) {
  const h = now.getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function Dashboard() {
  const data = Route.useLoaderData()
  const user = useUser()

  if (data.gymnastCount === 0 && data.upcoming.length === 0) {
    return <Welcome />
  }

  const now = new Date()
  const firstName = user?.name.split(" ")[0] ?? ""

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="relative flex flex-wrap items-end justify-between gap-4 max-md:-mx-4 max-md:-mt-4 max-md:overflow-hidden max-md:bg-sidebar max-md:px-4 max-md:pt-1 max-md:pb-6">
        <Bolt className="absolute -top-12 -right-9 size-[190px] rotate-12 text-white opacity-[0.07] md:hidden" />
        <div className="relative flex flex-col gap-1 md:gap-1.5">
          <p
            suppressHydrationWarning
            className="text-xs font-bold tracking-[0.08em] text-sidebar-muted uppercase md:text-primary"
          >
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1
            suppressHydrationWarning
            className="text-[25px] font-extrabold tracking-[-0.02em] max-md:text-white md:text-[30px]"
          >
            {greeting(now)}
            {firstName && `, ${firstName}`}
          </h1>
        </div>
      </div>

      {data.hasGroups && <ViewBar data={data} />}

      {/* Sized by the content area, not the window, since the sidebar takes
          part of it. Wide: competitions and groups on the left, injuries and
          the newest gymnasts in a narrower column on the right. Narrower: one
          column in that order, with injuries and the newest gymnasts side by
          side when there is room. */}
      <div className="@container">
        <div className="grid gap-4 md:gap-5 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:items-start">
          <div className="flex flex-col gap-4 md:gap-5">
            <CompetitionsCard data={data} />
            <GroupsCard data={data} />
          </div>
          <div className="grid gap-4 md:gap-5 @xl:grid-cols-2 @xl:items-start @4xl:grid-cols-1">
            <InjuriesCard data={data} />
            <NewestGymnastsCard data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
