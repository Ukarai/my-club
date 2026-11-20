// Who belongs to each custom group.
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { groupSubject, gymnastName, logActivity } from "../activity"
import { requireRole } from "../auth"
import { check, id } from "../check"
import { get, tx } from "../db"
import { today } from "@/lib/dates"

export const addGroupMembers = createServerFn({ method: "POST" })
  .validator(
    check(z.object({ groupId: id(), gymnastIds: z.array(id()).max(500) }))
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const group = groupSubject(d.groupId)
    const t = today()
    tx(() => {
      for (const gymnastId of d.gymnastIds) {
        const subject = gymnastName(gymnastId)
        const added = get(
          "INSERT INTO group_members (group_id, gymnast_id, added_on) VALUES (?, ?, ?) ON CONFLICT DO NOTHING RETURNING gymnast_id",
          d.groupId,
          gymnastId,
          t
        )
        if (added)
          logActivity(user, "group.member-add", `added them to ${group}`, {
            gymnastId,
            groupId: d.groupId,
            subject,
          })
      }
    })
  })

export const removeGroupMember = createServerFn({ method: "POST" })
  .validator(check(z.object({ groupId: id(), gymnastId: id() })))
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    const group = groupSubject(d.groupId)
    tx(() => {
      const removed = get(
        "DELETE FROM group_members WHERE group_id = ? AND gymnast_id = ? RETURNING gymnast_id",
        d.groupId,
        d.gymnastId
      )
      if (removed)
        logActivity(user, "group.member-remove", `removed them from ${group}`, {
          gymnastId: d.gymnastId,
          groupId: d.groupId,
          subject: gymnastName(d.gymnastId),
        })
    })
  })
