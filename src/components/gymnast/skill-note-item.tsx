import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { cn } from "cn"
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react"
import {
  deleteSkillNote,
  saveSkillNote,
  setSkillNoteArchived,
} from "@/server/functions/skill-notes"
import { FormError, NativeSelect, formValues } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/dates"
import {
  SKILL_NOTE_KINDS,
  type SkillNote,
  type SkillNoteKind,
  labelFor,
} from "@/lib/domain"
import { useAction } from "@/lib/use-action"
import { useCan } from "@/lib/use-user"

const SKILL_NOTE_KIND_STYLES: Record<SkillNoteKind, string> = {
  focus: "bg-primary-soft text-primary-dark",
  coaching_point: "bg-[#ebe4fc] text-[#5634b8]",
}

export function SkillNoteItem({
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
            {note.author && ` · by ${note.author}`}
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
