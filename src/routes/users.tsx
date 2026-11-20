import * as React from "react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { KeyRound, Plus } from "lucide-react"
import { listUsers, updateUser } from "@/server/functions/users"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FormError, NativeSelect } from "@/components/form"
import { useAction } from "@/lib/use-action"
import { useUser } from "@/lib/use-user"
import { type UserRow } from "@/lib/domain"
import { ROLES } from "@/lib/roles"
import { AddUserDialog } from "@/components/user/add-user-dialog"
import { ResetPasswordDialog } from "@/components/user/reset-password-dialog"

export const Route = createFileRoute("/users")({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== "admin") throw redirect({ to: "/" })
  },
  loader: () => listUsers(),
  component: UsersPage,
})

function UsersPage() {
  const users = Route.useLoaderData()
  const me = useUser()
  const router = useRouter()
  const [adding, setAdding] = React.useState(false)
  const [resetting, setResetting] = React.useState<UserRow | null>(null)
  const upd = useAction(
    async (patch: { id: number; role?: string; active?: boolean }) => {
      await updateUser({ data: patch })
      await router.invalidate()
    }
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Who can sign in, and what they can do.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add user
        </Button>
      </div>

      <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r.value} className="rounded-2xl bg-muted/60 p-3">
            <span className="font-medium text-foreground">{r.label}</span>:{" "}
            {r.hint}
          </li>
        ))}
      </ul>

      <FormError error={upd.error} />
      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isMe = u.id === me?.id
              return (
                <TableRow key={u.id} className={u.active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">
                    {u.name}{" "}
                    {isMe && (
                      <span className="text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <NativeSelect
                      value={u.role}
                      disabled={isMe || upd.pending}
                      className="min-w-24"
                      aria-label={`Role for ${u.name}`}
                      onChange={(e) =>
                        upd.run({ id: u.id, role: e.target.value })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    {isMe ? (
                      <span className="text-muted-foreground">Active</span>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={upd.pending}
                        onClick={() => upd.run({ id: u.id, active: !u.active })}
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isMe && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setResetting(u)}
                      >
                        <KeyRound /> Reset password
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Deactivated users are signed out straight away and can&apos;t sign in.
        Their past notes keep their name.
      </p>

      <AddUserDialog open={adding} onOpenChange={setAdding} />
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
      />
    </div>
  )
}
