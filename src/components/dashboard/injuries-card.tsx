import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { shortDate } from "@/lib/dates"
import type { DashboardData } from "./data"

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

export function InjuriesCard({ data }: { data: DashboardData }) {
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
