import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { cn } from "cn"
import { deleteNote, saveNote, setNoteResolved } from "@/server/functions/notes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NoteCategoryBadge } from "@/components/badges"
import { Field, FormError, NativeSelect, formValues } from "@/components/form"
import { EmptyState } from "@/components/empty-state"
import { useAction } from "@/lib/use-action"
import { NOTE_CATEGORIES } from "@/lib/domain"
import { formatDate, today } from "@/lib/dates"
import { useCan } from "@/lib/use-user"
import type { GymnastData } from "./data"

export function NotesTab({ data }: { data: GymnastData }) {
  const router = useRouter()
  const canEdit = useCan("coach")
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
              "surface flex flex-col gap-2 p-3",
              n.category === "injury" &&
                !n.resolved &&
                "border-l-4 border-l-[#d1432f]"
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
                    · by {n.author}
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
