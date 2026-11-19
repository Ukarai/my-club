import { SkillStatusBadge } from "@/components/badges"
import { EmptyState } from "@/components/form"
import { formatDate } from "@/lib/domain"
import type { GymnastData } from "./data"

export function HistoryTab({ data }: { data: GymnastData }) {
  if (data.history.length === 0)
    return <EmptyState title="No skill progress recorded yet" />
  return (
    <ol className="flex flex-col gap-1 border-l pl-4">
      {data.history.map((h) => (
        <li
          key={h.id}
          className="relative flex flex-wrap items-center gap-2 py-1 text-sm"
        >
          <span className="absolute top-2.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
          <span className="w-24 shrink-0 text-xs text-muted-foreground">
            {formatDate(h.recorded_on)}
          </span>
          <span className="font-medium">{h.skill_name}</span>
          <SkillStatusBadge status={h.status} />
          {h.recorded_by && (
            <span className="text-xs text-muted-foreground">
              by {h.recorded_by}
            </span>
          )}
          {h.note && <span className="text-muted-foreground">— {h.note}</span>}
        </li>
      ))}
    </ol>
  )
}
