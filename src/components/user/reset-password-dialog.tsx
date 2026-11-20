import { updateUser } from "@/server/functions/users"
import { Field, FormError, formValues } from "@/components/form"
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
import { MIN_PASSWORD_LENGTH, type UserRow } from "@/lib/domain"
import { useAction } from "@/lib/use-action"

export function ResetPasswordDialog({
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
