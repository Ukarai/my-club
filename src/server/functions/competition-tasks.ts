// Club tasks for each competition. Admin-only.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { competitionName, logActivity } from "../activity"
import { requireRole } from "../auth"
import { MAX, check, id, optionalDate, optionalText, text } from "../check"
import { get, run, tx } from "../db"

export const saveTask = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        competitionId: id(),
        title: text("Task", MAX.title, "Task needs a title"),
        due_date: optionalDate("Due date"),
        assignee: optionalText("Assignee", MAX.name),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const subject = competitionName(d.competitionId)
    return tx(() => {
      const taskId = run(
        "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
        d.competitionId,
        d.title,
        d.due_date,
        d.assignee
      )
      logActivity(user, "task.add", `added the task “${d.title}”`, {
        competitionId: d.competitionId,
        subject,
        detail: d.assignee ? `For ${d.assignee}` : null,
      })
      return taskId
    })
  })

type TaskInfo = {
  competition_id: number
  competition_name: string
  title: string
  done: number
}

function findTask(taskId: number) {
  const t = get<TaskInfo>(
    `SELECT k.competition_id, c.name AS competition_name, k.title, k.done
     FROM competition_tasks k JOIN competitions c ON c.id = k.competition_id
     WHERE k.id = ?`,
    taskId
  )
  if (!t) throw new Error("Task not found")
  return t
}

const taskLog = (t: TaskInfo) => ({
  competitionId: t.competition_id,
  subject: t.competition_name,
})

export const setTaskDone = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), done: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("admin")
    const t = findTask(d.id)
    if (Boolean(t.done) === d.done) return
    tx(() => {
      run(
        "UPDATE competition_tasks SET done = ? WHERE id = ?",
        d.done ? 1 : 0,
        d.id
      )
      logActivity(
        user,
        d.done ? "task.done" : "task.reopen",
        d.done
          ? `completed the task “${t.title}”`
          : `reopened the task “${t.title}”`,
        taskLog(t)
      )
    })
  })

export const deleteTask = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: taskId }) => {
    const user = requireRole("admin")
    const t = findTask(taskId)
    tx(() => {
      run("DELETE FROM competition_tasks WHERE id = ?", taskId)
      logActivity(
        user,
        "task.delete",
        `deleted the task “${t.title}”`,
        taskLog(t)
      )
    })
  })
