import { useRouter } from "@tanstack/react-router"
import { createUser } from "@/server/functions/users"
import { Field, FormError, NativeSelect, formValues } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MIN_PASSWORD_LENGTH } from "@/lib/domain"
import { ROLES } from "@/lib/roles"
import { useAction } from "@/lib/use-action"

export function AddUserDialog({
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
