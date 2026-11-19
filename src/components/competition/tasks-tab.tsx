import { useRouter } from "@tanstack/react-router"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  deleteTask,
  saveTask,
  setTaskDone,
} from "@/server/functions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  EmptyState,
  Field,
  FormError,
  formValues,
  useAction,
} from "@/components/form"
import { daysUntil, formatDate } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import type { CompetitionData } from "./data"

export function TasksTab({ data }: { data: CompetitionData }) {
  const router = useRouter()
  const canEdit = useCan("admin")
  const add = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveTask({
      data: {
        competitionId: data.competition.id,
        title: v.title,
        due_date: v.due_date,
        assignee: v.assignee,
      },
    })
    form.reset()
    await router.invalidate()
  })
  const act = useAction(async (fn: () => Promise<unknown>) => {
    await fn()
    await router.invalidate()
  })

  return (
    <div className="flex flex-col gap-4">
      <form
        className={cn("flex flex-wrap items-end gap-2", !canEdit && "hidden")}
        onSubmit={(e) => {
          e.preventDefault()
          add.run(e.currentTarget)
        }}
      >
        <Field label="Task" htmlFor="title" className="min-w-56 flex-1">
          <Input
            id="title"
            name="title"
            required
            placeholder="e.g. Submit routine cards"
          />
        </Field>
        <Field label="Due" htmlFor="due_date">
          <Input id="due_date" name="due_date" type="date" />
        </Field>
        <Field label="Who" htmlFor="assignee">
          <Input id="assignee" name="assignee" placeholder="Optional" />
        </Field>
        <Button type="submit" disabled={add.pending}>
          <Plus /> Add
        </Button>
      </form>
      <FormError error={add.error ?? act.error} />

      {data.tasks.length === 0 ? (
        <EmptyState title="No tasks yet">
          <p>
            Track things like entries, fees, routine cards, coaches, judges and
            travel.
          </p>
        </EmptyState>
      ) : (
        <fieldset disabled={!canEdit} className="min-w-0">
          <ul className="flex flex-col divide-y rounded-2xl border">
            {data.tasks.map((t) => {
              const overdue = !t.done && t.due_date && daysUntil(t.due_date) < 0
              return (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={!!t.done}
                    aria-label={`Mark "${t.title}" done`}
                    onChange={(e) =>
                      act.run(() =>
                        setTaskDone({
                          data: { id: t.id, done: e.target.checked },
                        })
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm",
                        t.done && "text-muted-foreground line-through"
                      )}
                    >
                      {t.title}
                    </div>
                    <div
                      className={cn(
                        "text-xs text-muted-foreground",
                        overdue && "text-destructive"
                      )}
                    >
                      {[
                        t.due_date && `Due ${formatDate(t.due_date)}`,
                        t.assignee,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Delete "${t.title}"`}
                    onClick={() => act.run(() => deleteTask({ data: t.id }))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}
    </div>
  )
}

// ───────────────────────────── Results ─────────────────────────────
