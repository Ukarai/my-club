// Training notes and per-skill coaching notes.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { run } from "../db"
import { SKILL_NOTE_KINDS, today } from "@/lib/domain"
import { input, blank } from "./util"

export const saveNote = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      noted_on: string
      category: string
      body: string
      author?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.body.trim()) throw new Error("Note can't be empty")
    if (d.id) {
      run(
        "UPDATE notes SET noted_on=?, category=?, body=?, author=? WHERE id=?",
        d.noted_on,
        d.category,
        d.body.trim(),
        blank(d.author),
        d.id
      )
      return d.id
    }
    return run(
      "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, ?, ?, ?)",
      d.gymnastId,
      d.noted_on || today(),
      d.category,
      d.body.trim(),
      blank(d.author)
    )
  })

export const setNoteResolved = createServerFn({ method: "POST" })
  .validator(input<{ id: number; resolved: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE notes SET resolved = ? WHERE id = ?",
      data.resolved ? 1 : 0,
      data.id
    )
  })

export const deleteNote = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM notes WHERE id = ?", id)
  })

// ───────────────────────────── Skill notes ─────────────────────────────

export const saveSkillNote = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      skillId: number
      kind: string
      body: string
    }>()
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    if (!SKILL_NOTE_KINDS.some((k) => k.value === d.kind))
      throw new Error("Unknown note type")
    const body = d.body.trim()
    if (!body) throw new Error("Note can't be empty")
    if (d.id) {
      run(
        "UPDATE skill_notes SET kind = ?, body = ? WHERE id = ? AND gymnast_id = ?",
        d.kind,
        body,
        d.id,
        d.gymnastId
      )
      return d.id
    }
    return run(
      "INSERT INTO skill_notes (gymnast_id, skill_id, kind, body, author, noted_on) VALUES (?, ?, ?, ?, ?, ?)",
      d.gymnastId,
      d.skillId,
      d.kind,
      body,
      user.name,
      today()
    )
  })

export const setSkillNoteArchived = createServerFn({ method: "POST" })
  .validator(input<{ id: number; archived: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE skill_notes SET archived = ? WHERE id = ?",
      data.archived ? 1 : 0,
      data.id
    )
  })

export const deleteSkillNote = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM skill_notes WHERE id = ?", id)
  })
