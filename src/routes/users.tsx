import * as React from "react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { KeyRound, Plus } from "lucide-react"
import { createUser, listUsers, updateUser } from "@/server/auth-functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Field,
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import { useUser } from "@/lib/use-user"
import { MIN_PASSWORD_LENGTH, ROLES, type UserRow } from "@/lib/domain"

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

function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await createUser({
      data: {
        name: v.name,
        email: v.email,
        role: v.role,
        password: v.password,
      },
    })
    await router.invalidate()
    onOpenChange(false)
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Give them this temporary password. They can change it from their
            account page.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="Name" htmlFor="new_name">
            <Input id="new_name" name="name" required />
          </Field>
          <Field label="Email" htmlFor="new_email">
            <Input
              id="new_email"
              name="email"
              type="email"
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Role" htmlFor="new_role">
            <NativeSelect id="new_role" name="role" defaultValue="coach">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Temporary password" htmlFor="new_password">
            <Input
              id="new_password"
              name="password"
              type="text"
              autoComplete="off"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
          <FormError error={save.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.pending}>
              {save.pending ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: UserRow | null
  onClose: () => void
}) {
  const save = useAction(async (form: HTMLFormElement) => {
    if (!user) return
    await updateUser({
      data: { id: user.id, password: formValues(form).password },
    })
    onClose()
  })
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user?.name}</DialogTitle>
          <DialogDescription>
            They&apos;ll be signed out everywhere and need this new password to
            sign in.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="New temporary password" htmlFor="reset_password">
            <Input
              id="reset_password"
              name="password"
              type="text"
              autoComplete="off"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.pending}>
              {save.pending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
