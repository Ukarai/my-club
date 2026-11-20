import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { Check, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  deleteTarget,
  saveTarget,
  setTargetStatus,
} from "@/server/functions/targets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillStatusBadge } from "@/components/badges"
import { Field, FormError, NativeSelect, formValues } from "@/components/form"
import { EmptyState } from "@/components/empty-state"
import { useAction } from "@/lib/use-action"
import { SKILL_STATUSES, labelFor } from "@/lib/domain"
import { daysUntil, formatDate } from "@/lib/dates"
import { useCan } from "@/lib/use-user"
import type { GymnastData } from "./data"

export function TargetsTab({ data }: { data: GymnastData }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const [skillId, setSkillId] = React.useState("")
  const add = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    const skill = data.skills.find((s) => String(s.id) === v.skill_id)
    await saveTarget({
      data: {
        gymnastId: data.gymnast.id,
        title:
          v.title ||
          (skill
            ? `${skill.name} — ${labelFor(SKILL_STATUSES, v.goal_status).toLowerCase()}`
            : ""),
        details: v.details,
        skill_id: v.skill_id ? Number(v.skill_id) : null,
        goal_status: v.goal_status,
        target_date: v.target_date,
      },
    })
    form.reset()
    setSkillId("")
    await router.invalidate()
  })
  const act = useAction(async (fn: () => Promise<unknown>) => {
    await fn()
    await router.invalidate()
  })
  const statusBySkill = new Map(
    data.gymnastSkills.map((s) => [s.skill_id, s.status])
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className={cn("lg:order-2", !canEdit && "hidden")}>
        <Card size="sm">
          <CardHeader>
            <CardTitle>New target</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                add.run(e.currentTarget)
              }}
            >
              <Field label="Linked skill (optional)" htmlFor="skill_id">
                <NativeSelect
                  id="skill_id"
                  name="skill_id"
                  value={skillId}
                  onChange={(e) => setSkillId(e.target.value)}
                >
                  <option value="">— None (general target) —</option>
                  {data.skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {skillId && (
                <Field label="Reach status" htmlFor="goal_status">
                  <NativeSelect
                    id="goal_status"
                    name="goal_status"
                    defaultValue="independent"
                  >
                    {SKILL_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field
                label={skillId ? "Title (optional)" : "Title"}
                htmlFor="title"
              >
                <Input
                  id="title"
                  name="title"
                  required={!skillId}
                  placeholder={
                    skillId
                      ? "Generated from skill if blank"
                      : "e.g. Pass Proficiency 6"
                  }
                />
              </Field>
              <Field label="Target date" htmlFor="target_date">
                <Input id="target_date" name="target_date" type="date" />
              </Field>
              <Field label="Details" htmlFor="details">
                <Textarea id="details" name="details" />
              </Field>
              {skillId && (
                <p className="text-xs text-muted-foreground">
                  Skill targets are marked achieved automatically when the skill
                  reaches this status.
                </p>
              )}
              <FormError error={add.error} />
              <Button type="submit" disabled={add.pending}>
                {add.pending ? "Saving…" : "Add target"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <FormError error={act.error} />
        {data.targets.length === 0 && <EmptyState title="No targets set" />}
        {data.targets.map((t) => {
          const days = t.target_date ? daysUntil(t.target_date) : null
          const current = t.skill_id ? statusBySkill.get(t.skill_id) : undefined
          return (
            <div
              key={t.id}
              className={cn(
                "surface flex flex-col gap-2 p-3",
                t.status !== "active" && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div
                    className={cn(
                      "font-medium",
                      t.status === "achieved" && "line-through"
                    )}
                  >
                    {t.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.status === "achieved"
                      ? `Achieved ${formatDate(t.achieved_on)}${t.closed_by ? ` by ${t.closed_by}` : ""}`
                      : t.status === "dropped"
                        ? `Dropped${t.closed_by ? ` by ${t.closed_by}` : ""}`
                        : t.target_date
                          ? days! < 0
                            ? `${-days!} days overdue (${formatDate(t.target_date)})`
                            : `Due ${formatDate(t.target_date)} · ${days} days`
                          : "No date"}
                    {t.created_by && ` · set by ${t.created_by}`}
                  </div>
                </div>
                <div className={cn("flex gap-1", !canEdit && "hidden")}>
                  {t.status === "active" ? (
                    <>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          act.run(() =>
                            setTargetStatus({
                              data: { id: t.id, status: "achieved" },
                            })
                          )
                        }
                      >
                        <Check /> Achieved
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          act.run(() =>
                            setTargetStatus({
                              data: { id: t.id, status: "dropped" },
                            })
                          )
                        }
                      >
                        Drop
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        act.run(() =>
                          setTargetStatus({
                            data: { id: t.id, status: "active" },
                          })
                        )
                      }
                    >
                      Reopen
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Delete target"
                    onClick={() =>
                      confirm("Delete this target?") &&
                      act.run(() => deleteTarget({ data: t.id }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {t.skill_name && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {t.skill_name}: now{" "}
                  {current ? (
                    <SkillStatusBadge status={current} />
                  ) : (
                    "not started"
                  )}{" "}
                  → goal{" "}
                  {t.goal_status && <SkillStatusBadge status={t.goal_status} />}
                </div>
              )}
              {t.details && (
                <p className="text-sm whitespace-pre-line">{t.details}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
