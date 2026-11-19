import * as React from "react"
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import {
  Archive,
  ArchiveRestore,
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
  deleteGymnast,
  deleteNote,
  deleteSkillNote,
  deleteTarget,
  getGymnast,
  saveNote,
  saveSkillNote,
  saveTarget,
  setGymnastActive,
  setNoteResolved,
  setSkillNoteArchived,
  setSkillStatus,
  setTargetStatus,
} from "@/server/functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  EntryStatusBadge,
  InjuryBadge,
  NoteCategoryBadge,
  SKILL_STATUS_STYLES,
  SkillStatusBadge,
} from "@/components/badges"
import {
  EmptyState,
  Field,
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import { GymnastDialog, useDialog } from "@/components/gymnast-form"
import {
  NOTE_CATEGORIES,
  SKILL_NOTE_KINDS,
  SKILL_STATUSES,
  ageFrom,
  daysUntil,
  formatDate,
  labelFor,
  today,
  type SkillNote,
  type SkillNoteKind,
  type SkillStatus,
} from "@/lib/domain"
import { useCan, useUser } from "@/lib/use-user"

const TABS = ["skills", "notes", "targets", "competitions", "history"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/gymnasts/$gymnastId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
  loader: ({ params }) => getGymnast({ data: Number(params.gymnastId) }),
  component: GymnastPage,
})

type Data = Awaited<ReturnType<typeof getGymnast>>

function GymnastPage() {
  const data = Route.useLoaderData()
  const { tab = "skills" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const edit = useDialog()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const g = data.gymnast
  const age = ageFrom(g.date_of_birth)
  const openInjuries = data.notes.filter(
    (n) => n.category === "injury" && !n.resolved
  )

  const archive = useAction(async () => {
    await setGymnastActive({ data: { id: g.id, active: !g.active } })
    await router.invalidate()
  })
  const remove = useAction(async () => {
    if (
      !confirm(
        `Permanently delete ${g.first_name} ${g.last_name} and all their skills, notes and targets? This can't be undone. (Archiving keeps their history.)`
      )
    )
      return
    await deleteGymnast({ data: g.id })
    await navigate({ to: "/gymnasts" })
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/gymnasts"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Gymnasts
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {g.first_name} {g.last_name}
            {openInjuries.length > 0 && <InjuryBadge />}
            {!g.active && (
              <span className="text-sm font-normal text-muted-foreground">
                (archived)
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[age !== null && `Age ${age}`, g.squad, g.level]
              .filter(Boolean)
              .join(" · ") || "No details yet"}
          </p>
        </div>
        <div className={cn("flex gap-2", !canEdit && "hidden")}>
          <Button variant="outline" onClick={edit.show}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => archive.run()}
            disabled={archive.pending}
          >
            {g.active ? <Archive /> : <ArchiveRestore />}
            {g.active ? "Archive" : "Restore"}
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => remove.run()}
              aria-label="Delete gymnast"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {(g.medical_info || g.guardian_contact) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {g.guardian_contact && (
            <div className="rounded-2xl bg-muted/60 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground">
                Contact
              </div>
              {g.guardian_contact}
            </div>
          )}
          {g.medical_info && (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
              <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Medical
              </div>
              <p className="whitespace-pre-line">{g.medical_info}</p>
            </div>
          )}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: { tab: v as Tab }, replace: true })
        }
      >
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="notes">
            Notes{data.notes.length > 0 && ` (${data.notes.length})`}
          </TabsTrigger>
          <TabsTrigger value="targets">
            Targets
            {data.targets.filter((t) => t.status === "active").length > 0 &&
              ` (${data.targets.filter((t) => t.status === "active").length})`}
          </TabsTrigger>
          <TabsTrigger value="competitions">Competitions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="skills" className="pt-4">
          <SkillsTab data={data} />
        </TabsContent>
        <TabsContent value="notes" className="pt-4">
          <NotesTab data={data} />
        </TabsContent>
        <TabsContent value="targets" className="pt-4">
          <TargetsTab data={data} />
        </TabsContent>
        <TabsContent value="competitions" className="pt-4">
          <CompetitionsTab data={data} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab data={data} />
        </TabsContent>
      </Tabs>

      <FormError error={archive.error ?? remove.error} />
      <GymnastDialog
        open={edit.open}
        onOpenChange={edit.onOpenChange}
        gymnast={g}
      />
    </div>
  )
}

// ───────────────────────────── Skills ─────────────────────────────

type SkillFilter = "all" | "tracked" | "untracked" | "notes"

function SkillsTab({ data }: { data: Data }) {
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

function NotesTab({ data }: { data: Data }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const user = useUser()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [category, setCategory] = React.useState<string>("all")

  const add = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveNote({
      data: {
        gymnastId: data.gymnast.id,
        noted_on: v.noted_on,
        category: v.category,
        body: v.body,
        author: v.author,
      },
    })
    form.reset()
    await router.invalidate()
  })
  const act = useAction(async (fn: () => Promise<unknown>) => {
    await fn()
    await router.invalidate()
  })

  const notes = data.notes.filter(
    (n) => category === "all" || n.category === category
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div
        className={cn("flex flex-col gap-3 lg:order-2", !canEdit && "hidden")}
      >
        <Card size="sm">
          <CardHeader>
            <CardTitle>Add note</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                add.run(e.currentTarget)
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" htmlFor="noted_on">
                  <Input
                    id="noted_on"
                    name="noted_on"
                    type="date"
                    defaultValue={today()}
                    required
                  />
                </Field>
                <Field label="Type" htmlFor="category">
                  <NativeSelect
                    id="category"
                    name="category"
                    defaultValue="general"
                  >
                    {NOTE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Note" htmlFor="body">
                <Textarea
                  id="body"
                  name="body"
                  required
                  placeholder="e.g. Rolled ankle on landing — rest from twisting this week"
                />
              </Field>
              <Field label="Coach" htmlFor="author">
                <Input
                  id="author"
                  name="author"
                  placeholder="Optional"
                  defaultValue={user?.name}
                />
              </Field>
              <FormError error={add.error} />
              <Button type="submit" disabled={add.pending}>
                {add.pending ? "Saving…" : "Add note"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <NativeSelect
          className="w-auto self-start"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter notes"
        >
          <option value="all">All notes</option>
          {NOTE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
        <FormError error={act.error} />
        {notes.length === 0 && <EmptyState title="No notes yet" />}
        {notes.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-3",
              n.category === "injury" &&
                !n.resolved &&
                "border-red-300 dark:border-red-900"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <NoteCategoryBadge category={n.category} />
                <span className="text-sm font-medium">
                  {formatDate(n.noted_on)}
                </span>
                {n.author && (
                  <span className="text-xs text-muted-foreground">
                    · {n.author}
                  </span>
                )}
                {n.category === "injury" && (
                  <span className="text-xs text-muted-foreground">
                    · {n.resolved ? "resolved" : "open"}
                  </span>
                )}
              </div>
              <div className={cn("flex gap-1", !canEdit && "hidden")}>
                {n.category === "injury" && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      act.run(() =>
                        setNoteResolved({
                          data: { id: n.id, resolved: !n.resolved },
                        })
                      )
                    }
                  >
                    {n.resolved ? "Reopen" : "Mark resolved"}
                  </Button>
                )}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Delete note"
                  onClick={() =>
                    confirm("Delete this note?") &&
                    act.run(() => deleteNote({ data: n.id }))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-line">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── Targets ─────────────────────────────

function TargetsTab({ data }: { data: Data }) {
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
                "flex flex-col gap-2 rounded-2xl border p-3",
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
                      ? `Achieved ${formatDate(t.achieved_on)}`
                      : t.status === "dropped"
                        ? "Dropped"
                        : t.target_date
                          ? days! < 0
                            ? `${-days!} days overdue (${formatDate(t.target_date)})`
                            : `Due ${formatDate(t.target_date)} · ${days} days`
                          : "No date"}
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

// ───────────────────────────── Competitions ─────────────────────────────

function CompetitionsTab({ data }: { data: Data }) {
  if (data.entries.length === 0)
    return (
      <EmptyState title="No competition entries">
        <p>
          Add {data.gymnast.first_name} to a competition from the{" "}
          <Link to="/competitions" className="underline">
            Competitions
          </Link>{" "}
          page.
        </p>
      </EmptyState>
    )
  return (
    <div className="flex flex-col gap-2">
      {data.entries.map((e) => (
        <Link
          key={e.id}
          to="/competitions/$competitionId"
          params={{ competitionId: String(e.competition_id) }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 hover:bg-muted"
        >
          <div>
            <div className="font-medium">{e.competition_name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(e.start_date)}
              {e.category && ` · ${e.category}`}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {e.score !== null && (
              <span className="tabular-nums">{e.score.toFixed(3)}</span>
            )}
            {e.placing !== null && (
              <span className="font-semibold">#{e.placing}</span>
            )}
            <EntryStatusBadge status={e.status} />
          </div>
        </Link>
      ))}
    </div>
  )
}

// ───────────────────────────── History ─────────────────────────────

function HistoryTab({ data }: { data: Data }) {
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
          {h.note && <span className="text-muted-foreground">— {h.note}</span>}
        </li>
      ))}
    </ol>
  )
}
