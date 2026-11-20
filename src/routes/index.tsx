import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { Plus, Target as TargetIcon } from "lucide-react"
import { cn } from "cn"
import type * as React from "react"
import { getDashboard } from "@/server/functions/dashboard"
import { loadDemoData } from "@/server/functions/demo"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CompetitionStatusBadge, SkillStatusBadge } from "@/components/badges"
import { Avatar, ClubLogo } from "@/components/avatar"
import { EmptyState, FormError, useAction } from "@/components/form"
import { CLUB } from "@/lib/club"
import { daysUntil } from "@/lib/domain"
import { useCan, useUser } from "@/lib/use-user"

export const Route = createFileRoute("/")({
  loader: () => getDashboard(),
  component: Dashboard,
})

type DashboardData = Awaited<ReturnType<typeof getDashboard>>

function parseIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** "19 Nov", or "9 Mar 2027" outside the current year. */
function shortDate(iso: string) {
  const date = parseIso(iso)
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && {
      year: "numeric",
    }),
  })
}

function inDays(days: number) {
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  return `in ${days} days`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function greeting(now: Date) {
  const h = now.getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

/** Month and day stacked in a small tinted block. */
function DateBlock({ iso, className }: { iso: string; className: string }) {
  const date = parseIso(iso)
  return (
    <span
      className={cn(
        "flex w-[50px] shrink-0 flex-col items-center rounded-[10px] py-1.5",
        className
      )}
    >
      <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
      <span className="text-xl leading-[1.1] font-extrabold">
        {date.getDate()}
      </span>
    </span>
  )
}

/** Rows inside a dashboard card: full-bleed, with a divider between them. */
const row =
  "flex items-center gap-3.5 border-b border-divider px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#f7f9fc] md:px-5"

function CountPill({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold",
        className
      )}
    >
      {n}
    </span>
  )
}

function Competitions({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>Upcoming competitions</CardTitle>
        <Link
          to="/competitions"
          className="text-[13px] font-semibold text-primary hover:text-primary-dark"
        >
          View all
        </Link>
      </CardHeader>
      {data.upcoming.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          Nothing scheduled.{" "}
          <Link to="/competitions" className="text-primary underline">
            Add a competition
          </Link>
        </p>
      )}
      {data.upcoming.map((c) => {
        const days = daysUntil(c.start_date)
        const deadline = c.entry_deadline ? daysUntil(c.entry_deadline) : null
        return (
          <Link
            key={c.id}
            to="/competitions/$competitionId"
            params={{ competitionId: String(c.id) }}
            className={row}
          >
            <DateBlock
              iso={c.start_date}
              className={
                days <= 30
                  ? "bg-primary-soft text-primary-dark"
                  : "bg-secondary text-[#364660]"
              }
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{c.name}</span>
              <span className="text-[13px] text-muted-foreground">
                {parseIso(c.start_date).getFullYear() !==
                  new Date().getFullYear() &&
                  `${parseIso(c.start_date).getFullYear()} · `}
                {capitalize(inDays(days))} · {c.entry_count} entered
              </span>
              {deadline !== null && deadline >= 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    deadline <= 7 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  Entries close {inDays(deadline)}
                </span>
              )}
            </span>
            <span className="max-sm:hidden">
              <CompetitionStatusBadge status={c.status} />
            </span>
          </Link>
        )
      })}
    </Card>
  )
}

function Injuries({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>Open injuries</CardTitle>
        {data.injuries.length > 0 && (
          <CountPill
            n={data.injuries.length}
            className="bg-[#b42318] text-white"
          />
        )}
      </CardHeader>
      <div className="flex flex-col gap-3 px-4 md:px-5">
        {data.injuries.length === 0 && (
          <p className="text-sm text-muted-foreground">No open injuries.</p>
        )}
        {data.injuries.map((n) => (
          <Link
            key={n.id}
            to="/gymnasts/$gymnastId"
            params={{ gymnastId: String(n.gymnast_id) }}
            search={{ tab: "notes" }}
            className="flex flex-col gap-1.5 rounded-[10px] border border-l-4 border-[#f6d0cb] border-l-[#d1432f] bg-[#fff4f2] px-4 py-3.5 transition-colors hover:bg-[#ffece8]"
          >
            <span className="flex justify-between gap-3">
              <span className="text-sm font-bold">{n.gymnast_name}</span>
              <span className="text-[13px] text-[#6b4a46]">
                {shortDate(n.noted_on)}
              </span>
            </span>
            <span className="line-clamp-3 text-sm leading-normal text-[#3b2b29]">
              {n.body}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

function Targets({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>Targets due</CardTitle>
      </CardHeader>
      {data.targetsDue.length === 0 && (
        <div className="p-5">
          <EmptyState title="No active targets" />
        </div>
      )}
      {data.targetsDue.map((t) => {
        const days = t.target_date ? daysUntil(t.target_date) : null
        return (
          <Link
            key={t.id}
            to="/gymnasts/$gymnastId"
            params={{ gymnastId: String(t.gymnast_id) }}
            search={{ tab: "targets" }}
            className={row}
          >
            {t.target_date ? (
              <DateBlock
                iso={t.target_date}
                className={
                  days !== null && days < 0
                    ? "bg-[#fde3e1] text-[#9f1f14]"
                    : "bg-[#fcefc7] text-[#7c5100]"
                }
              />
            ) : (
              <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[10px] bg-secondary text-[#364660]">
                <TargetIcon className="size-5" />
              </span>
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{t.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {t.gymnast_name}
                {days !== null &&
                  (days < 0 ? (
                    <span className="font-semibold text-destructive">
                      {" "}
                      · {-days}d overdue
                    </span>
                  ) : (
                    ` · ${inDays(days)}`
                  ))}
              </span>
            </span>
          </Link>
        )
      })}
    </Card>
  )
}

function RecentProgress({ data }: { data: DashboardData }) {
  // Group consecutive updates by gymnast, keeping newest-first order.
  const groups: {
    id: number
    name: string
    items: DashboardData["recentProgress"]
  }[] = []
  for (const h of data.recentProgress) {
    const g = groups.find((x) => x.id === h.gymnast_id)
    if (g) g.items.push(h)
    else groups.push({ id: h.gymnast_id, name: h.gymnast_name, items: [h] })
  }

  return (
    <Card className="gap-0">
      <CardHeader className="mb-1.5">
        <CardTitle>Recent progress</CardTitle>
      </CardHeader>
      {groups.length === 0 && (
        <p className="px-5 text-sm text-muted-foreground">
          Skill updates will show here.
        </p>
      )}
      {groups.map((g) => (
        <div
          key={g.id}
          className="border-b border-divider pb-1.5 last:border-b-0 last:pb-0"
        >
          <Link
            to="/gymnasts/$gymnastId"
            params={{ gymnastId: String(g.id) }}
            className="flex items-center gap-2.5 px-4 pt-2.5 pb-1 hover:text-primary md:px-5"
          >
            <Avatar name={g.name} seed={g.id} />
            <span className="text-sm font-bold">{g.name}</span>
            <span className="text-xs text-muted-foreground">
              {g.items.length} {g.items.length === 1 ? "update" : "updates"}
            </span>
          </Link>
          {g.items.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-3 py-2 pr-4 pl-[54px] md:pr-5 md:pl-[58px]"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-[#17253b]">
                  {h.skill_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {shortDate(h.recorded_on)}
                  {h.recorded_by && ` · ${h.recorded_by}`}
                </span>
              </span>
              <SkillStatusBadge status={h.status} />
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
}

function Welcome() {
  const router = useRouter()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const demo = useAction(async () => {
    await loadDemoData()
    await router.invalidate()
  })
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 pt-6 md:pt-10">
      <ClubLogo className="size-16 shadow-[0_0_0_3px_var(--sidebar)]" />
      <h1 className="text-[26px] font-extrabold tracking-tight">
        Welcome to {CLUB.name}
      </h1>
      <p className="text-muted-foreground">
        Track each gymnast&apos;s skills, training notes and targets, and manage
        your club&apos;s competition entries in one place.
      </p>
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button
            size="lg"
            nativeButton={false}
            render={<Link to="/gymnasts" search={{ add: true }} />}
          >
            Add your first gymnast
          </Button>
        )}
        {isAdmin && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => demo.run()}
            disabled={demo.pending}
          >
            {demo.pending ? "Loading…" : "Load demo data"}
          </Button>
        )}
      </div>
      <FormError error={demo.error} />
    </div>
  )
}

/** Lightning bolt watermark behind the phone greeting. */
function Bolt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  )
}

function Dashboard() {
  const data = Route.useLoaderData()
  const user = useUser()
  const canEdit = useCan("coach")

  if (data.counts.gymnasts === 0 && data.upcoming.length === 0) {
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
        {canEdit && (
          <Button
            size="lg"
            className="h-11 gap-2 px-[18px] font-semibold max-md:hidden"
            nativeButton={false}
            render={<Link to="/gymnasts" search={{ add: true }} />}
          >
            <Plus className="size-4" strokeWidth={2.5} /> Add gymnast
          </Button>
        )}
      </div>

      {/* Sized by the content area, not the window, since the sidebar takes
          part of it. Wide: competitions and progress on the left, injuries
          and targets in a narrower column on the right. Narrower: injuries
          and targets come first, side by side when there is room. */}
      <div className="@container">
        <div className="grid gap-4 md:gap-5 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:items-start">
          <div className="grid gap-4 md:gap-5 @xl:grid-cols-2 @4xl:col-start-2 @4xl:row-start-1 @4xl:grid-cols-1">
            <Injuries data={data} />
            <Targets data={data} />
          </div>
          <div className="flex flex-col gap-4 md:gap-5 @4xl:col-start-1 @4xl:row-start-1">
            <Competitions data={data} />
            <RecentProgress data={data} />
          </div>
        </div>
      </div>

      {canEdit && (
        <Link
          to="/gymnasts"
          search={{ add: true }}
          aria-label="Add gymnast"
          className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-[18px] bg-primary text-white shadow-[0_6px_18px_rgb(11_31_61/0.35)] md:hidden"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  )
}
