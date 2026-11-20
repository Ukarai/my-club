import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { saveSkillNote } from "@/server/functions/skill-notes"
import { FormError, NativeSelect, formValues } from "@/components/form"
import { SkillNoteItem } from "@/components/gymnast/skill-note-item"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SKILL_NOTE_KINDS, type SkillNote } from "@/lib/domain"
import { useAction } from "@/lib/use-action"
import { useCan } from "@/lib/use-user"

export function SkillNotesPanel({
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
