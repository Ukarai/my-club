// Activity log rows grouped by day: who did what, and when.
import { Link } from "@tanstack/react-router"
import { CLUB } from "@/lib/club"
import type { Activity } from "@/lib/domain"

// A fixed locale and time zone, so the server and the browser agree.
const zone = { timeZone: CLUB.timeZone }
const isoDay = new Intl.DateTimeFormat("en-CA", {
  ...zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const longDay = new Intl.DateTimeFormat("en-GB", {
  ...zone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})
const clock = new Intl.DateTimeFormat("en-GB", {
  ...zone,
  hour: "2-digit",
  minute: "2-digit",
})

/** Older entries (from before the log existed) only have a date. */
const dateOnly = (at: string) => at.length === 10

/** The club-local day, as YYYY-MM-DD. */
const dayOf = (at: string) => (dateOnly(at) ? at : isoDay.format(new Date(at)))

/** Noon UTC on a day stays on that day in the club's time zone. */
const noon = (day: string) => new Date(`${day}T12:00:00Z`)

function dayHeading(day: string) {
  const today = isoDay.format(new Date())
  const yesterday = new Date(noon(today).getTime() - 864e5)
    .toISOString()
    .slice(0, 10)
  if (day === today) return "Today"
  if (day === yesterday) return "Yesterday"
  return longDay.format(noon(day))
}

function Subject({ row }: { row: Activity }) {
  const cls = "font-medium text-foreground hover:underline"
  if (row.gymnast_id)
    return (
      <Link
        to="/gymnasts/$gymnastId"
        params={{ gymnastId: String(row.gymnast_id) }}
        className={cls}
      >
        {row.subject}
      </Link>
    )
  if (row.competition_id)
    return (
      <Link
        to="/competitions/$competitionId"
        params={{ competitionId: String(row.competition_id) }}
        className={cls}
      >
        {row.subject}
      </Link>
    )
  if (row.group_id)
    return (
      <Link
        to="/groups/$groupId"
        params={{ groupId: String(row.group_id) }}
        className={cls}
      >
        {row.subject}
      </Link>
    )
  return <span className="font-medium text-foreground">{row.subject}</span>
}

export function ActivityList({
  rows,
  showSubject,
}: {
  rows: Activity[]
  /** Show what each action was about. Off where that's already clear. */
  showSubject: boolean
}) {
  const days: { day: string; rows: Activity[] }[] = []
  for (const row of rows) {
    const day = dayOf(row.at)
    if (days.at(-1)?.day !== day) days.push({ day, rows: [] })
    days.at(-1)!.rows.push(row)
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map(({ day, rows: dayRows }) => (
        <section key={day} className="flex flex-col">
          <h3 className="pb-1 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            {dayHeading(day)}
          </h3>
          <ol className="divide-y">
            {dayRows.map((row) => {
              const subject = showSubject && row.subject
              return (
                <li key={row.id} className="flex gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {row.user_name ?? "Someone"}
                      </span>{" "}
                      {row.summary}
                    </p>
                    {(subject || row.detail) && (
                      <p className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
                        {subject && <Subject row={row} />}
                        {subject && row.detail && " · "}
                        {row.detail}
                      </p>
                    )}
                  </div>
                  {!dateOnly(row.at) && (
                    <time
                      dateTime={row.at}
                      className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums"
                    >
                      {clock.format(new Date(row.at))}
                    </time>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
