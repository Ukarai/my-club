// Per-skill coaching notes. Each note's author is whoever was signed in when
// it was added.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { article, gymnastName, logActivity, skillName } from "../activity"
import { requireRole } from "../auth"
import { MAX, check, id, oneOf, text } from "../check"
import { get, run, tx } from "../db"
import { today } from "@/lib/dates"
import { SKILL_NOTE_KINDS } from "@/lib/domain"

const kindName = (kind: string) =>
  kind === "focus" ? "focus" : "coaching point"

export const saveSkillNote = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id().optional(),
        gymnastId: id(),
        skillId: id(),
        kind: oneOf(SKILL_NOTE_KINDS),
        body: text("Note", MAX.text, "Note can't be empty"),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const log = { gymnastId: d.gymnastId, subject: gymnastName(d.gymnastId) }
    const what = `${article(kindName(d.kind))} for ${skillName(d.skillId)}`
    return tx(() => {
      if (d.id) {
        const updated = get(
          "UPDATE skill_notes SET kind = ?, body = ? WHERE id = ? AND gymnast_id = ? AND skill_id = ? RETURNING id",
          d.kind,
          d.body,
          d.id,
          d.gymnastId,
          d.skillId
        )
        if (!updated) throw new Error("Note not found")
        logActivity(user, "skill-note.edit", `edited ${what}`, log)
        return d.id
      }
      const noteId = run(
        "INSERT INTO skill_notes (gymnast_id, skill_id, kind, body, author, noted_on) VALUES (?, ?, ?, ?, ?, ?)",
        d.gymnastId,
        d.skillId,
        d.kind,
        d.body,
        user.name,
        today()
      )
      logActivity(user, "skill-note.add", `added ${what}`, log)
      return noteId
    })
  })

type SkillNoteRow = {
  gymnast_id: number
  skill_name: string
  kind: string
  archived: number
}

function findSkillNote(noteId: number) {
  const note = get<SkillNoteRow>(
    `SELECT n.gymnast_id, s.name AS skill_name, n.kind, n.archived
     FROM skill_notes n JOIN skills s ON s.id = n.skill_id WHERE n.id = ?`,
    noteId
  )
  if (!note) throw new Error("Note not found")
  return note
}

export const setSkillNoteArchived = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), archived: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const note = findSkillNote(d.id)
    if (Boolean(note.archived) === d.archived) return
    const what = `the ${kindName(note.kind)} for ${note.skill_name}`
    const summary = !d.archived
      ? `made ${what} current again`
      : note.kind === "focus"
        ? `marked ${what} done`
        : `marked ${what} as no longer applying`
    tx(() => {
      run(
        "UPDATE skill_notes SET archived = ? WHERE id = ?",
        d.archived ? 1 : 0,
        d.id
      )
      logActivity(
        user,
        d.archived ? "skill-note.archive" : "skill-note.restore",
        summary,
        { gymnastId: note.gymnast_id, subject: gymnastName(note.gymnast_id) }
      )
    })
  })

export const deleteSkillNote = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: noteId }) => {
    const user = requireRole("coach")
    const note = findSkillNote(noteId)
    tx(() => {
      run("DELETE FROM skill_notes WHERE id = ?", noteId)
      logActivity(
        user,
        "skill-note.delete",
        `deleted ${article(kindName(note.kind))} for ${note.skill_name}`,
        { gymnastId: note.gymnast_id, subject: gymnastName(note.gymnast_id) }
      )
    })
  })
