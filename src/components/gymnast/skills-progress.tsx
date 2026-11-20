import { cn } from "cn"
import { SKILL_STATUS_STYLES } from "@/components/badges"
import type { SkillFilter } from "@/components/gymnast/skill-filter"
import { stripLabel } from "@/components/gymnast/strip-label"
import { SKILL_STATUSES } from "@/lib/domain"
import type { GymnastData } from "./data"

/**
 * Stacked bar of how many catalogue skills are at each status. The key
 * below it filters the Skills tab to a stage; tap again to show all.
 */
export function SkillsProgress({
  data,
  filter,
  onPick,
}: {
  data: GymnastData
  /** The Skills tab's filter, or null when another tab is open. */
  filter: SkillFilter | null
  onPick: (filter: SkillFilter) => void
}) {
  const total = data.skills.length
  // Most advanced first, so the bar fills from the left with the best work.
  const counts = [...SKILL_STATUSES].reverse().map((st) => ({
    ...st,
    n: data.gymnastSkills.filter((x) => x.status === st.value).length,
  }))
  const started = counts.reduce((sum, c) => sum + c.n, 0)
  const summary = [
    ...counts.filter((c) => c.n).map((c) => `${c.n} ${c.label.toLowerCase()}`),
    `${total - started} not started`,
  ].join(", ")

  return (
    <div className="flex flex-[3_1_360px] flex-col gap-2">
      <div className="flex justify-between gap-3">
        <span className={stripLabel}>Skills progress</span>
        <span className="text-[13px] text-muted-foreground">
          <strong className="text-foreground">{started}</strong> of {total}{" "}
          started
        </span>
      </div>
      <div
        role="img"
        aria-label={summary}
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-[#d9e1ec]"
      >
        {total > 0 &&
          counts.map(
            (c) =>
              c.n > 0 && (
                <span
                  key={c.value}
                  className={SKILL_STATUS_STYLES[c.value].dot}
                  style={{ width: `${(c.n / total) * 100}%` }}
                />
              )
          )}
      </div>
      <div
        role="group"
        aria-label="Show skills at a stage"
        className="-mx-2 flex flex-wrap gap-x-1 gap-y-0.5 text-xs text-[#364660]"
      >
        {counts.map((c) => {
          const active = filter === c.value
          return (
            <button
              key={c.value}
              type="button"
              title={c.hint}
              aria-pressed={active}
              onClick={() => onPick(active ? "all" : c.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-white hover:text-foreground",
                active &&
                  "bg-white text-foreground shadow-[0_1px_2px_rgb(11_31_61/0.08)] ring-1 ring-[#d6dfeb]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-[2px]",
                  SKILL_STATUS_STYLES[c.value].dot
                )}
              />
              {c.label} <strong className="text-foreground">{c.n}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}
