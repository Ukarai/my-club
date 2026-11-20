import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { Plus, X } from "lucide-react"
import { addGroupMembers, removeGroupMember } from "@/server/functions/groups"
import { GroupBadge } from "@/components/badges"
import { FormError, NativeSelect, useAction } from "@/components/form"
import { useCan } from "@/lib/use-user"
import type { GymnastData } from "./data"

export function GymnastGroups({ data }: { data: GymnastData }) {
  const router = useRouter()
  const canEdit = useCan("coach")
  const gymnastId = data.gymnast.id
  const member = data.groups.filter((gr) => gr.member)
  const others = data.groups.filter((gr) => !gr.member)
  const [adding, setAdding] = React.useState(false)

  const add = useAction(async (groupId: number) => {
    await addGroupMembers({ data: { groupId, gymnastIds: [gymnastId] } })
    await router.invalidate()
    setAdding(false)
  })
  const remove = useAction(async (groupId: number) => {
    await removeGroupMember({ data: { groupId, gymnastId } })
    await router.invalidate()
  })

  if (!member.length && !canEdit) return null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="sr-only">Groups:</span>
        {member.map((gr) => (
          <span key={gr.id} className="inline-flex items-center">
            <Link
              to="/groups/$groupId"
              params={{ groupId: String(gr.id) }}
              className="rounded-2xl hover:opacity-80"
            >
              <GroupBadge name={gr.name} color={gr.color} />
            </Link>
            {canEdit && (
              <button
                type="button"
                className="-ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label={`Remove from ${gr.name}`}
                disabled={remove.pending}
                onClick={() => remove.run(gr.id)}
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {canEdit &&
          (adding ? (
            <NativeSelect
              autoFocus
              className="h-[26px] w-auto rounded-full px-2.5 text-xs md:text-xs"
              aria-label="Add to group"
              defaultValue=""
              disabled={add.pending}
              onBlur={() => !add.pending && setAdding(false)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              onChange={(e) =>
                e.target.value && add.run(Number(e.target.value))
              }
            >
              <option value="" disabled>
                Choose a group…
              </option>
              {others.map((gr) => (
                <option key={gr.id} value={gr.id}>
                  {gr.name}
                </option>
              ))}
            </NativeSelect>
          ) : others.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-[26px] items-center gap-1 rounded-full border border-dashed border-[#a9b8cd] px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3" strokeWidth={2.5} /> Add to group
            </button>
          ) : data.groups.length === 0 ? (
            <Link
              to="/groups"
              className="text-xs text-muted-foreground hover:underline"
            >
              Create a group…
            </Link>
          ) : null)}
      </div>
      <FormError error={add.error ?? remove.error} />
    </div>
  )
}
