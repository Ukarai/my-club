// Training notes. Each note's author is whoever was signed in when it was
// added.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireRole } from "../auth"
import { get, run, tx } from "../db"
import { MAX, check, id, oneOf, optionalDate, text } from "../check"
import { article, gymnastName, logActivity } from "../activity"
import { NOTE_CATEGORIES, labelFor } from "@/lib/domain"
import { today } from "@/lib/dates"

/** "an injury note", "a general note"… */
const noteKind = (category: string) =>
  article(`${labelFor(NOTE_CATEGORIES, category).toLowerCase()} note`)

export const saveNote = createServerFn({ method: "POST" })
  .validator(
    check(
      z.object({
        id: id().optional(),
        gymnastId: id(),
        noted_on: optionalDate("Date"),
        category: oneOf(NOTE_CATEGORIES),
        body: text("Note", MAX.text, "Note can't be empty"),
      })
    )
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const log = { gymnastId: d.gymnastId, subject: gymnastName(d.gymnastId) }
    const notedOn = d.noted_on ?? today()
    return tx(() => {
      if (d.id) {
        // The original author stays; the log records who edited it.
        const updated = get(
          "UPDATE notes SET noted_on = ?, category = ?, body = ? WHERE id = ? AND gymnast_id = ? RETURNING id",
          notedOn,
          d.category,
          d.body,
          d.id,
          d.gymnastId
        )
        if (!updated) throw new Error("Note not found")
        logActivity(user, "note.edit", `edited ${noteKind(d.category)}`, log)
        return d.id
      }
      const noteId = run(
        "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, ?, ?, ?)",
        d.gymnastId,
        notedOn,
        d.category,
        d.body,
        user.name
      )
      logActivity(user, "note.add", `added ${noteKind(d.category)}`, log)
      return noteId
    })
  })

type NoteRow = { gymnast_id: number; category: string; resolved: number }

function findNote(noteId: number) {
  const note = get<NoteRow>(
    "SELECT gymnast_id, category, resolved FROM notes WHERE id = ?",
    noteId
  )
  if (!note) throw new Error("Note not found")
  return note
}

export const setNoteResolved = createServerFn({ method: "POST" })
  .validator(check(z.object({ id: id(), resolved: z.boolean() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const note = findNote(d.id)
    if (Boolean(note.resolved) === d.resolved) return
    const what = note.category === "injury" ? "an injury" : "a note"
    tx(() => {
      run(
        "UPDATE notes SET resolved = ? WHERE id = ?",
        d.resolved ? 1 : 0,
        d.id
      )
      logActivity(
        user,
        d.resolved ? "note.resolve" : "note.reopen",
        d.resolved ? `marked ${what} resolved` : `reopened ${what}`,
        { gymnastId: note.gymnast_id, subject: gymnastName(note.gymnast_id) }
      )
    })
  })

export const deleteNote = createServerFn({ method: "POST" })
  .validator(check(id()))
  .handler(async ({ data: noteId }) => {
    const user = requireRole("coach")
    const note = findNote(noteId)
    tx(() => {
      run("DELETE FROM notes WHERE id = ?", noteId)
      logActivity(user, "note.delete", `deleted ${noteKind(note.category)}`, {
        gymnastId: note.gymnast_id,
        subject: gymnastName(note.gymnast_id),
      })
    })
  })
