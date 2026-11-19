import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { AlertTriangle, CalendarDays, Target, Users } from "lucide-react"
import { getDashboard, loadDemoData } from "@/server/functions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CompetitionStatusBadge, SkillStatusBadge } from "@/components/badges"
import { EmptyState, FormError, useAction } from "@/components/form"
import { daysUntil, formatDate } from "@/lib/domain"
import { useCan } from "@/lib/use-user"

export const Route = createFileRoute("/")({
  loader: () => getDashboard(),
  component: Dashboard,
})

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Users
  tone?: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <Icon className={tone ?? "text-muted-foreground"} />
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const demo = useAction(async () => {
    await loadDemoData()
    await router.invalidate()
  })

  if (data.counts.gymnasts === 0 && data.upcoming.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 pt-10">
        <h1 className="text-2xl font-semibold">Welcome to My Club</h1>
        <p className="text-muted-foreground">
          Track each gymnast&apos;s skills, training notes and targets, and
          manage your club&apos;s competition entries in one place.
        </p>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button nativeButton={false} render={<Link to="/gymnasts" />}>
              Add your first gymnast
            </Button>
          )}
          {isAdmin && (
            <Button
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Active gymnasts"
          value={data.counts.gymnasts}
          icon={Users}
        />
        <Stat
          label="Active targets"
          value={data.counts.targets}
          icon={Target}
        />
        <Stat
          label="Upcoming competitions"
          value={data.upcoming.length}
          icon={CalendarDays}
        />
        <Stat
          label="Open injuries"
          value={data.counts.injuries}
          icon={AlertTriangle}
          tone={data.counts.injuries ? "text-destructive" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming competitions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled.{" "}
                <Link to="/competitions" className="text-primary underline">
                  Add a competition
                </Link>
              </p>
            )}
            {data.upcoming.map((c) => {
              const days = daysUntil(c.start_date)
              const deadline = c.entry_deadline
                ? daysUntil(c.entry_deadline)
                : null
              return (
                <Link
                  key={c.id}
                  to="/competitions/$competitionId"
                  params={{ competitionId: String(c.id) }}
                  className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(c.start_date)} ·{" "}
                      {days === 0 ? "today" : `in ${days} days`} ·{" "}
                      {c.entry_count} entered
                      {deadline !== null && deadline >= 0 && (
                        <span
                          className={deadline <= 7 ? "text-destructive" : ""}
                        >
                          {" "}
                          · entries close in {deadline}d
                        </span>
                      )}
                    </div>
                  </div>
                  <CompetitionStatusBadge status={c.status} />
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open injuries</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.injuries.length === 0 && (
              <p className="text-sm text-muted-foreground">No open injuries.</p>
            )}
            {data.injuries.map((n) => (
              <Link
                key={n.id}
                to="/gymnasts/$gymnastId"
                params={{ gymnastId: String(n.gymnast_id) }}
                search={{ tab: "notes" }}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">{n.gymnast_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(n.noted_on)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {n.body}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.targetsDue.length === 0 && (
              <EmptyState title="No active targets" />
            )}
            {data.targetsDue.map((t) => {
              const days = t.target_date ? daysUntil(t.target_date) : null
              return (
                <Link
                  key={t.id}
                  to="/gymnasts/$gymnastId"
                  params={{ gymnastId: String(t.gymnast_id) }}
                  search={{ tab: "targets" }}
                  className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {t.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.gymnast_name}
                    </div>
                  </div>
                  {days !== null && (
                    <span
                      className={
                        "text-xs whitespace-nowrap " +
                        (days < 0
                          ? "text-destructive"
                          : "text-muted-foreground")
                      }
                    >
                      {days < 0
                        ? `${-days}d overdue`
                        : `due ${formatDate(t.target_date)}`}
                    </span>
                  )}
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {data.recentProgress.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Skill updates will show here.
              </p>
            )}
            {data.recentProgress.map((h) => (
              <Link
                key={h.id}
                to="/gymnasts/$gymnastId"
                params={{ gymnastId: String(h.gymnast_id) }}
                className="flex items-center justify-between gap-3 rounded-xl p-2 text-sm hover:bg-muted"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{h.gymnast_name}</span> ·{" "}
                  {h.skill_name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <SkillStatusBadge status={h.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(h.recorded_on)}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
