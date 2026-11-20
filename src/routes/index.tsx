import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { Users } from "lucide-react"
import { cn } from "cn"
import type * as React from "react"
import { getDashboard, type DashboardView } from "@/server/functions/dashboard"
import { loadDemoData } from "@/server/functions/demo"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CompetitionStatusBadge, GROUP_COLOR_STYLES } from "@/components/badges"
import { Avatar, ClubLogo } from "@/components/avatar"
import { FormError, useAction } from "@/components/form"
import { CLUB } from "@/lib/club"
import { daysUntil } from "@/lib/domain"
import { useCan, useUser } from "@/lib/use-user"

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { view?: DashboardView } =>
    s.view === "mine" || s.view === "all" ? { view: s.view } : {},
  loaderDeps: ({ search }) => ({ view: search.view }),
  loader: ({ deps }) => getDashboard({ data: { view: deps.view } }),
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

/** A card header with its title and a "View all" link. */
function CardHeading({
  title,
  to,
}: {
  title: string
  to: "/competitions" | "/groups" | "/gymnasts"
}) {
  return (
    <CardHeader className="grid-cols-[1fr_auto]">
      <CardTitle>{title}</CardTitle>
      <Link
        to={to}
        className="text-[13px] font-semibold text-primary hover:text-primary-dark"
      >
        View all
      </Link>
    </CardHeader>
  )
}

/** "today", "yesterday" or a short date. */
function addedOn(iso: string) {
  const ago = -daysUntil(iso)
  if (ago <= 0) return "today"
  if (ago === 1) return "yesterday"
  return shortDate(iso)
}

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
      <CardHeading title="Upcoming competitions" to="/competitions" />
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
                {c.my_entry_count !== null && c.entry_count > 0 && (
                  <span
                    className={cn(
                      c.my_entry_count > 0 && "font-semibold text-primary-dark"
                    )}
                  >
                    {" "}
                    · {c.my_entry_count} from your groups
                  </span>
                )}
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
          <p className="text-sm text-muted-foreground">
            No open injuries{data.view === "mine" && " in your groups"}.
          </p>
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

/** How many groups the card lists before pointing to the full list. */
const GROUPS_SHOWN = 8

function Groups({ data }: { data: DashboardData }) {
  const user = useUser()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const mine = data.view === "mine"
  const shown = data.groups.slice(0, GROUPS_SHOWN)
  const more = data.groups.length - shown.length
  return (
    <Card className="gap-0 pb-0">
      <CardHeading title={mine ? "Your groups" : "Groups"} to="/groups" />
      {data.groups.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          No groups yet.
          {canEdit && (
            <>
              {" "}
              <Link to="/groups" className="text-primary underline">
                Create a group
              </Link>
            </>
          )}
        </p>
      )}
      {shown.map((g) => (
        <Link
          key={g.id}
          to="/groups/$groupId"
          params={{ groupId: String(g.id) }}
          className={row}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
              GROUP_COLOR_STYLES[g.color]?.pill ?? GROUP_COLOR_STYLES.sky?.pill
            )}
          >
            <Users className="size-4" strokeWidth={2.25} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{g.name}</span>
            <span className="truncate text-[13px] text-muted-foreground">
              <span className="tabular-nums">
                {g.member_count} gymnast{g.member_count === 1 ? "" : "s"}
              </span>
              {/* In "My groups" every coach is the user, so skip it. */}
              {!mine &&
                (g.primary_coach_name
                  ? ` · ${g.primary_coach_id === user?.id ? "You" : g.primary_coach_name}`
                  : isAdmin && " · No coach yet")}
            </span>
          </span>
        </Link>
      ))}
      {more > 0 && (
        <Link
          to="/groups"
          className={cn(
            row,
            "justify-center py-3 text-[13px] font-semibold text-primary"
          )}
        >
          {more} more {more === 1 ? "group" : "groups"}
        </Link>
      )}
    </Card>
  )
}

function NewestGymnasts({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeading title="Newest gymnasts" to="/gymnasts" />
      {data.newestGymnasts.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          No gymnasts{data.view === "mine" && " in your groups"} yet.
        </p>
      )}
      {data.newestGymnasts.map((g) => {
        const name = `${g.first_name} ${g.last_name}`
        const details = [g.squad, g.level].filter(Boolean).join(" · ")
        return (
          <Link
            key={g.id}
            to="/gymnasts/$gymnastId"
            params={{ gymnastId: String(g.id) }}
            className={row}
          >
            <Avatar name={name} seed={g.id} className="size-9 text-xs" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Added {addedOn(g.created_at)}
                </span>
              </span>
              {details && (
                <span className="truncate text-[13px] text-muted-foreground">
                  {details}
                </span>
              )}
            </span>
          </Link>
        )
      })}
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

/** "My groups" / "Whole club" switch. */
function ViewBar({ data }: { data: DashboardData }) {
  const views: { value: DashboardView; label: string }[] = [
    { value: "mine", label: "My groups" },
    { value: "all", label: "Whole club" },
  ]
  return (
    <nav
      aria-label="Dashboard view"
      className="flex w-fit gap-0.5 rounded-[10px] border border-[#d6dfeb] bg-muted p-[3px]"
    >
      {views.map((v) => (
        <Link
          key={v.value}
          to="/"
          search={{ view: v.value }}
          replace
          aria-current={data.view === v.value ? "page" : undefined}
          className={cn(
            "rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            data.view === v.value
              ? "bg-white text-foreground shadow-[0_1px_3px_rgb(11_31_61/0.18)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
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
            <Competitions data={data} />
            <Groups data={data} />
          </div>
          <div className="grid gap-4 md:gap-5 @xl:grid-cols-2 @xl:items-start @4xl:grid-cols-1">
            <Injuries data={data} />
            <NewestGymnasts data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
