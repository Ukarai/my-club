import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import {
  Check,
  ChevronDown,
  Crosshair,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "cn"
import {
  deleteSkillNote,
  saveSkillNote,
  setSkillNoteArchived,
} from "@/server/functions/notes"
import { setSkillStatus } from "@/server/functions/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SKILL_STATUS_STYLES } from "@/components/badges"
import {
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import {
  SKILL_NOTE_KINDS,
  SKILL_STATUSES,
  formatDate,
  labelFor,
  type SkillNote,
  type SkillNoteKind,
  type SkillStatus,
} from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import type { GymnastData } from "./data"

type SkillFilter = "all" | "tracked" | "untracked" | "notes"

export function SkillsTab({ data }: { data: GymnastData }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const [filter, setFilter] = React.useState<SkillFilter>("all")
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

  function jumpTo(skillId: number) {
    setFilter("all")
    toggle(skillId, true)
    requestAnimationFrame(() =>
      document
        .getElementById(`skill-${skillId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    )
  }

  const categories = [...new Set(data.skills.map((s) => s.category))]
  const counts = SKILL_STATUSES.map((st) => ({
    ...st,
    n: data.gymnastSkills.filter((x) => x.status === st.value).length,
  }))
  const matches = (skillId: number) =>
    filter === "all" ||
    (filter === "notes"
      ? (notesBySkill.get(skillId) ?? []).some((n) => !n.archived)
      : (filter === "tracked") === statusBySkill.has(skillId))

  return (
    <div className="flex flex-col gap-4">
      {focuses.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="size-4 text-sky-600 dark:text-sky-400" />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {counts.map((c) => (
            <span
              key={c.value}
              title={c.hint}
              className={cn(
                "rounded-2xl px-2.5 py-1 text-xs font-medium",
                SKILL_STATUS_STYLES[c.value]
              )}
            >
              {c.label}: {c.n}
            </span>
          ))}
        </div>
        <NativeSelect
          className="w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as SkillFilter)}
          aria-label="Filter skills"
        >
          <option value="all">All skills</option>
          <option value="tracked">Started</option>
          <option value="untracked">Not started</option>
          <option value="notes">With notes</option>
        </NativeSelect>
      </div>
      <FormError error={error} />

      {categories.map((cat) => {
        const skills = data.skills.filter(
          (s) => s.category === cat && matches(s.id)
        )
        if (!skills.length) return null
        return (
          <Card key={cat} size="sm">
            <CardHeader>
              <CardTitle>{cat}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {skills.map((s) => {
                const current = statusBySkill.get(s.id)
                const notes = notesBySkill.get(s.id) ?? []
                const activeNotes = notes.filter((n) => !n.archived)
                const focus = activeNotes.find((n) => n.kind === "focus")
                const isOpen = open.has(s.id)
                return (
                  <div key={s.id} id={`skill-${s.id}`} className="py-2">
                    <div
                      className={cn(
                        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                        pendingSkill === s.id && "opacity-60"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="font-medium">
                          {s.name}{" "}
                          <span className="text-xs font-normal text-muted-foreground tabular-nums">
                            {s.tariff.toFixed(1)}
                          </span>
                        </div>
                        {current && (
                          <div className="text-xs text-muted-foreground">
                            Updated {formatDate(current.updated_at)}
                            {current.updated_by && ` by ${current.updated_by}`}
                          </div>
                        )}
                        {focus && !isOpen && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-sky-700 dark:text-sky-300">
                            <span className="font-medium">Focus:</span>{" "}
                            {focus.body}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {SKILL_STATUSES.map((st) => {
                          const active = current?.status === st.value
                          return (
                            <button
                              key={st.value}
                              type="button"
                              title={st.hint}
                              disabled={!canEdit || pendingSkill === s.id}
                              onClick={() => !active && update(s.id, st.value)}
                              aria-pressed={active}
                              className={cn(
                                "rounded-2xl px-2 py-1 text-xs transition-colors",
                                active
                                  ? cn(
                                      SKILL_STATUS_STYLES[st.value],
                                      "font-semibold ring-1 ring-current/30"
                                    )
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {st.label}
                            </button>
                          )
                        })}
                        {current && (
                          <button
                            type="button"
                            title="Clear status"
                            aria-label={`Clear ${s.name}`}
                            disabled={!canEdit || pendingSkill === s.id}
                            onClick={() => update(s.id, null)}
                            className="rounded-2xl p-1 text-muted-foreground hover:bg-muted"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                        {(canEdit || notes.length > 0) && (
                          <button
                            type="button"
                            onClick={() => toggle(s.id)}
                            aria-expanded={isOpen}
                            aria-label={`Notes for ${s.name}`}
                            title="Skill notes"
                            className={cn(
                              "ml-1 flex items-center gap-1 rounded-2xl px-2 py-1 text-xs transition-colors hover:bg-muted",
                              isOpen || activeNotes.length > 0
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            <MessageSquareText className="size-3.5" />
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
            </CardContent>
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

const SKILL_NOTE_KIND_STYLES: Record<SkillNoteKind, string> = {
  focus: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  coaching_point:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
}

function SkillNotesPanel({
  gymnastId,
  skillId,
  notes,
}: {
  gymnastId: number
  skillId: number
  notes: SkillNote[]
}) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const [showPast, setShowPast] = React.useState(false)
  const active = notes.filter((n) => !n.archived)
  const past = notes.filter((n) => n.archived)
  const add = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveSkillNote({
      data: { gymnastId, skillId, kind: v.kind, body: v.body },
    })
    form.reset()
    await router.invalidate()
  })

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-muted/50 p-3">
      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No current notes for this skill.
        </p>
      )}
      {active.map((n) => (
        <SkillNoteItem key={n.id} note={n} gymnastId={gymnastId} />
      ))}
      {past.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showPast ? "Hide" : "Show"} {past.length} past{" "}
          {past.length === 1 ? "note" : "notes"}
        </button>
      )}
      {showPast &&
        past.map((n) => (
          <SkillNoteItem key={n.id} note={n} gymnastId={gymnastId} />
        ))}
      {canEdit && (
        <form
          className="flex flex-col gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            add.run(e.currentTarget)
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <NativeSelect
              name="kind"
              aria-label="Note type"
              className="sm:w-40"
              defaultValue="focus"
            >
              {SKILL_NOTE_KINDS.map((k) => (
                <option key={k.value} value={k.value} title={k.hint}>
                  {k.label}
                </option>
              ))}
            </NativeSelect>
            <Textarea
              name="body"
              required
              rows={2}
              aria-label="New skill note"
              placeholder="e.g. Keep head up for longer on take-off to improve direction"
              className="min-h-0 flex-1 bg-background"
            />
          </div>
          <FormError error={add.error} />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={add.pending}
          >
            {add.pending ? "Adding…" : "Add note"}
          </Button>
        </form>
      )}
    </div>
  )
}

function SkillNoteItem({
  note,
  gymnastId,
}: {
  note: SkillNote
  gymnastId: number
}) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const [editing, setEditing] = React.useState(false)
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveSkillNote({
      data: {
        id: note.id,
        gymnastId,
        skillId: note.skill_id,
        kind: v.kind,
        body: v.body,
      },
    })
    setEditing(false)
    await router.invalidate()
  })
  const archive = useAction(async () => {
    await setSkillNoteArchived({
      data: { id: note.id, archived: !note.archived },
    })
    await router.invalidate()
  })
  const remove = useAction(async () => {
    if (!confirm("Delete this note? This can't be undone.")) return
    await deleteSkillNote({ data: note.id })
    await router.invalidate()
  })
  const doneLabel = note.kind === "focus" ? "Mark done" : "No longer applies"

  if (editing) {
    return (
      <form
        className="flex flex-col gap-2 rounded-xl bg-background p-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          save.run(e.currentTarget)
        }}
      >
        <NativeSelect
          name="kind"
          aria-label="Note type"
          defaultValue={note.kind}
          className="sm:w-40"
        >
          {SKILL_NOTE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </NativeSelect>
        <Textarea
          name="body"
          required
          rows={2}
          defaultValue={note.body}
          aria-label="Edit skill note"
          autoFocus
        />
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={save.pending}>
            {save.pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-2 rounded-xl bg-background p-2.5",
        note.archived && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "rounded-2xl px-2 py-0.5 font-medium",
              SKILL_NOTE_KIND_STYLES[note.kind]
            )}
          >
            {labelFor(SKILL_NOTE_KINDS, note.kind)}
          </span>
          <span>
            {formatDate(note.noted_on)}
            {note.author && ` · ${note.author}`}
            {note.archived ? " · done" : ""}
          </span>
        </div>
        <p className="mt-1 text-sm whitespace-pre-line">{note.body}</p>
        <FormError error={archive.error ?? remove.error} />
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-start">
          <Button
            variant="ghost"
            size="icon-sm"
            title={note.archived ? "Make current again" : doneLabel}
            aria-label={note.archived ? "Make current again" : doneLabel}
            onClick={() => archive.run()}
            disabled={archive.pending}
          >
            {note.archived ? <RotateCcw /> : <Check />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Edit"
            aria-label="Edit note"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Delete"
            aria-label="Delete note"
            onClick={() => remove.run()}
            disabled={remove.pending}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

// ───────────────────────────── Notes ─────────────────────────────
