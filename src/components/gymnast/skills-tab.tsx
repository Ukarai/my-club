import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { ChevronDown, Crosshair, MessageSquareText, X } from "lucide-react"
import { cn } from "cn"
import { setSkillStatus } from "@/server/functions/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SKILL_STATUS_STYLES } from "@/components/badges"
import { FormError, NativeSelect } from "@/components/form"
import { SKILL_STATUSES, type SkillNote, type SkillStatus } from "@/lib/domain"
import { formatDate } from "@/lib/dates"
import { useCan } from "@/lib/use-user"
import type { GymnastData } from "./data"
import { type SkillFilter, FILTERS } from "@/components/gymnast/skill-filter"
import { SkillNotesPanel } from "@/components/gymnast/skill-notes-panel"

export function SkillsTab({
  data,
  filter,
  onFilterChange: setFilter,
}: {
  data: GymnastData
  /** Kept in the page URL so the header's stage key can set it too. */
  filter: SkillFilter
  onFilterChange: (filter: SkillFilter) => Promise<void>
}) {
  const router = useRouter()
  const canEdit = useCan("coach")
  // Skills changed since the filter was picked stay in view, so a skill
  // doesn't vanish the moment its status moves it out of the filter.
  const [kept, setKept] = React.useState<ReadonlySet<number>>(new Set())
  const [keptFor, setKeptFor] = React.useState(filter)
  if (keptFor !== filter) {
    setKeptFor(filter)
    setKept(new Set())
  }
  const [open, setOpen] = React.useState<ReadonlySet<number>>(new Set())
  const [pendingSkill, setPendingSkill] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const statusBySkill = new Map(data.gymnastSkills.map((s) => [s.skill_id, s]))
  const notesBySkill = new Map<number, SkillNote[]>()
  for (const n of data.skillNotes) {
    const list = notesBySkill.get(n.skill_id) ?? []
    list.push(n)
    notesBySkill.set(n.skill_id, list)
  }
  const skillName = new Map(data.skills.map((s) => [s.id, s.name]))
  const focuses = data.skillNotes.filter(
    (n) => n.kind === "focus" && !n.archived
  )

  async function update(skillId: number, status: SkillStatus | null) {
    setKept((prev) => new Set(prev).add(skillId))
    setPendingSkill(skillId)
    setError(null)
    try {
      await setSkillStatus({
        data: { gymnastId: data.gymnast.id, skillId, status },
      })
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPendingSkill(null)
    }
  }

  function toggle(skillId: number, force?: boolean) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (force ?? !next.has(skillId)) next.add(skillId)
      else next.delete(skillId)
      return next
    })
  }

  async function jumpTo(skillId: number) {
    await setFilter("all")
    toggle(skillId, true)
    requestAnimationFrame(() =>
      document
        .getElementById(`skill-${skillId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    )
  }

  const categories = [...new Set(data.skills.map((s) => s.category))]
  const fits = (f: SkillFilter, skillId: number) => {
    switch (f) {
      case "all":
        return true
      case "notes":
        return (notesBySkill.get(skillId) ?? []).some((n) => !n.archived)
      case "tracked":
        return statusBySkill.has(skillId)
      case "untracked":
        return !statusBySkill.has(skillId)
      default:
        return statusBySkill.get(skillId)?.status === f
    }
  }
  const countFor = (f: SkillFilter) =>
    data.skills.filter((s) => fits(f, s.id)).length
  const matches = (skillId: number) =>
    kept.has(skillId) || fits(filter, skillId)
  const stage = SKILL_STATUSES.find((st) => st.value === filter)
  const nothingShown = !data.skills.some((s) => matches(s.id))

  return (
    <div className="flex flex-col gap-4">
      {focuses.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="size-4 text-primary" />
              Current focus
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {focuses.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => jumpTo(n.skill_id)}
                className="-mx-2 rounded-xl px-2 py-1 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{skillName.get(n.skill_id)}</span>
                <span className="text-muted-foreground"> — {n.body}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <label className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
          Show
          <NativeSelect
            className="h-9 w-auto font-semibold md:text-[13px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as SkillFilter)}
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} ({countFor(f.value)})
              </option>
            ))}
            <optgroup label="Stage">
              {SKILL_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label} ({countFor(st.value)})
                </option>
              ))}
            </optgroup>
          </NativeSelect>
        </label>
      </div>
      <FormError error={error} />

      {nothingShown && (
        <div className="surface flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5 text-sm text-muted-foreground md:px-5">
          {stage
            ? `No skills at ${stage.label} yet.`
            : FILTERS.find((f) => f.value === filter)?.empty}
          {filter !== "all" && (
            <button
              type="button"
              className="font-semibold text-primary hover:text-primary-dark"
              onClick={() => setFilter("all")}
            >
              Show all skills
            </button>
          )}
        </div>
      )}

      {categories.map((cat) => {
        const inCategory = data.skills.filter((s) => s.category === cat)
        const skills = inCategory.filter((s) => matches(s.id))
        if (!skills.length) return null
        const started = inCategory.filter((s) => statusBySkill.has(s.id))
        return (
          <Card key={cat} className="gap-0 pb-0">
            <CardHeader className="grid-cols-[1fr_auto] md:py-3">
              <CardTitle>{cat}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {started.length} of {inCategory.length} started
              </span>
            </CardHeader>
            <div className="flex flex-col">
              {skills.map((s) => {
                const current = statusBySkill.get(s.id)
                const notes = notesBySkill.get(s.id) ?? []
                const activeNotes = notes.filter((n) => !n.archived)
                const focus = activeNotes.find((n) => n.kind === "focus")
                const isOpen = open.has(s.id)
                return (
                  <div
                    key={s.id}
                    id={`skill-${s.id}`}
                    className="border-b border-divider px-4 py-3 last:border-b-0 md:px-5"
                  >
                    <div
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5",
                        pendingSkill === s.id && "opacity-60"
                      )}
                    >
                      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5 max-sm:basis-0">
                        <div className="text-sm font-semibold">
                          {s.name}{" "}
                          <span className="text-xs font-medium text-[#66768c] tabular-nums">
                            {s.tariff.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {current ? (
                            <>
                              Updated {formatDate(current.updated_at)}
                              {current.updated_by &&
                                ` by ${current.updated_by}`}
                            </>
                          ) : (
                            <span className="text-[#66768c]">Not started</span>
                          )}
                        </div>
                        {focus && !isOpen && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-primary-dark">
                            <span className="font-medium">Focus:</span>{" "}
                            {focus.body}
                          </p>
                        )}
                      </div>
                      {/* On phones the switch drops onto its own full-width line. */}
                      <div className="flex items-center gap-1 max-sm:contents">
                        <div
                          role="group"
                          aria-label={`Status of ${s.name}`}
                          className="grid grid-cols-[repeat(5,auto)] gap-0.5 rounded-[10px] border border-[#d6dfeb] bg-muted p-[3px] max-sm:order-last max-sm:w-full sm:flex"
                        >
                          {SKILL_STATUSES.map((st) => {
                            const active = current?.status === st.value
                            return (
                              <button
                                key={st.value}
                                type="button"
                                title={st.hint}
                                disabled={!canEdit || pendingSkill === s.id}
                                onClick={() =>
                                  !active && update(s.id, st.value)
                                }
                                aria-pressed={active}
                                className={cn(
                                  "min-h-[30px] rounded-[7px] px-1 text-[11px] leading-tight transition-colors sm:px-2.5 sm:text-xs",
                                  active
                                    ? cn(
                                        SKILL_STATUS_STYLES[st.value].solid,
                                        "font-bold text-white shadow-[0_1px_3px_rgb(11_31_61/0.3)]"
                                      )
                                    : "font-medium text-muted-foreground enabled:hover:bg-white enabled:hover:text-foreground"
                                )}
                              >
                                {st.label}
                              </button>
                            )
                          })}
                        </div>
                        {current && canEdit ? (
                          <button
                            type="button"
                            title="Clear status"
                            aria-label={`Clear ${s.name}`}
                            disabled={pendingSkill === s.id}
                            onClick={() => update(s.id, null)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#66768c] hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        ) : (
                          // Keeps the switches lined up from row to row.
                          <span aria-hidden className="size-9 shrink-0" />
                        )}
                        {(canEdit || notes.length > 0) && (
                          <button
                            type="button"
                            onClick={() => toggle(s.id)}
                            aria-expanded={isOpen}
                            aria-label={`Notes for ${s.name}`}
                            title="Skill notes"
                            className={cn(
                              "flex h-9 shrink-0 items-center gap-1 rounded-[9px] px-2 text-xs font-semibold transition-colors hover:bg-muted",
                              isOpen || activeNotes.length > 0
                                ? "text-primary"
                                : "text-[#66768c]"
                            )}
                          >
                            <MessageSquareText className="size-[17px]" />
                            {activeNotes.length > 0 ? activeNotes.length : null}
                            <ChevronDown
                              className={cn(
                                "size-3 transition-transform",
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <SkillNotesPanel
                        gymnastId={data.gymnast.id}
                        skillId={s.id}
                        notes={notes}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
      <p className="text-xs text-muted-foreground">
        Missing a skill? Add it on the{" "}
        <Link to="/skills" className="underline">
          Skills page
        </Link>
        .
      </p>
    </div>
  )
}
