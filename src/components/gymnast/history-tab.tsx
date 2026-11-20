import { ActivityList } from "@/components/activity-list"
import { EmptyState } from "@/components/empty-state"
import type { GymnastData } from "./data"

/** Everything done to this gymnast's records, and who did it. */
export function HistoryTab({ data }: { data: GymnastData }) {
  if (data.activity.length === 0)
    return <EmptyState title="Nothing recorded yet" />
  return (
    <div className="surface px-4 py-3">
      <ActivityList rows={data.activity} showSubject={false} />
    </div>
  )
}
